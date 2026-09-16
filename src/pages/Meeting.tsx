import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    ArrowLeft,
    Users,
    ShieldCheck,
    Loader2,
    AlertCircle
} from "lucide-react";

import {
    io,
    Socket
} from "socket.io-client";

import { isLoggedIn } from "../lib/auth";

// =====================================================
// CONFIGURATION
// =====================================================

const BACKEND_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5001";

const SOCKET_URL =
    BACKEND_URL;

// Google public STUN servers.
// These help browsers discover their public network
// addresses for WebRTC peer-to-peer connections.
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        },
        {
            urls: "stun:stun1.l.google.com:19302"
        },
        {
            urls: "stun:stun2.l.google.com:19302"
        }
    ]
};

// =====================================================
// TYPES
// =====================================================

interface MeetingInfo {
    id?: number;
    appointmentId?: number;
    roomName?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    joinUrl?: string;
    canJoin?: boolean;
    state?: string;
    role?: string;
    citizenName?: string;
    advocateName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    mode?: string;
}

interface Participant {
    socketId: string;
    userId: string;
    role: string;
}

// =====================================================
// HELPERS
// =====================================================

function getAppointmentId(): string | null {
    const parts =
        window.location.pathname
            .split("/")
            .filter(Boolean);

    const index =
        parts.findIndex(
            (part) => part === "meeting"
        );

    if (
        index === -1 ||
        !parts[index + 1]
    ) {
        return null;
    }

    return parts[index + 1];
}

function formatMeetingDate(
    value?: string
): string {

    if (!value) {
        return "Scheduled consultation";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}

// =====================================================
// COMPONENT
// =====================================================

export default function Meeting() {

    // =================================================
    // STATE
    // =================================================

    const [meeting, setMeeting] =
        useState<MeetingInfo | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [connected, setConnected] =
        useState(false);

    const [participantConnected, setParticipantConnected] =
        useState(false);

    const [cameraEnabled, setCameraEnabled] =
        useState(true);

    const [micEnabled, setMicEnabled] =
        useState(true);

    const [joining, setJoining] =
        useState(false);

    const [ending, setEnding] =
        useState(false);

    const [connectionStatus, setConnectionStatus] =
        useState(
            "Preparing consultation..."
        );

    const [remoteConnected, setRemoteConnected] =
        useState(false);

    // =================================================
    // REFS
    // =================================================

    const localVideoRef =
        useRef<HTMLVideoElement | null>(
            null
        );

    const remoteVideoRef =
        useRef<HTMLVideoElement | null>(
            null
        );

    const localStreamRef =
        useRef<MediaStream | null>(
            null
        );

    const peerConnectionRef =
        useRef<RTCPeerConnection | null>(
            null
        );

    const socketRef =
        useRef<Socket | null>(
            null
        );

    const appointmentIdRef =
        useRef<string | null>(
            null
        );

    const participantConnectedRef =
        useRef(false);

    const mountedRef =
        useRef(true);

    const makingOfferRef =
        useRef(false);

    // Queue ICE candidates that arrive before remote SDP is applied.
    const pendingIceCandidatesRef =
        useRef<RTCIceCandidateInit[]>([]);

    // Stable remote stream for browsers that do not populate event.streams.
    const remoteStreamRef =
        useRef<MediaStream | null>(null);

    // =================================================
    // GET APPOINTMENT ID
    // =================================================

    useEffect(() => {

        appointmentIdRef.current =
            getAppointmentId();

        if (
            !appointmentIdRef.current
        ) {

            setError(
                "Invalid consultation link."
            );

            setLoading(false);

            return;
        }

        if (!isLoggedIn()) {

            setError(
                "Please log in before joining the consultation."
            );

            setLoading(false);

            return;
        }

    }, []);

    // =================================================
    // LOAD MEETING INFORMATION
    // =================================================

    useEffect(() => {

        let cancelled = false;

        async function loadMeeting() {

            const appointmentId =
                appointmentIdRef.current;

            if (
                !appointmentId ||
                !isLoggedIn()
            ) {
                return;
            }

            try {

                setLoading(true);

                setConnectionStatus(
                    "Checking consultation..."
                );

                const response =
                    await fetch(
                        `${BACKEND_URL}/api/meetings/${appointmentId}`,
                        {
                            method: "GET",
                            credentials: "include",
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    throw new Error(
                        data?.message ||
                        "Unable to load consultation."
                    );
                }

                if (
                    !data?.success ||
                    !data?.meeting
                ) {

                    throw new Error(
                        data?.message ||
                        "Consultation details were not found."
                    );
                }

                if (cancelled) {
                    return;
                }

                setMeeting(
                    data.meeting
                );

                // Do not automatically enter
                // a consultation that is outside
                // its permitted joining window.
                if (
                    data.meeting.canJoin === false
                ) {

                    setConnectionStatus(
                        "The consultation is not open yet."
                    );

                } else {

                    setConnectionStatus(
                        "Ready to join consultation."
                    );
                }

            } catch (err) {

                console.error(
                    "Load meeting error:",
                    err
                );

                if (!cancelled) {

                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load consultation."
                    );

                }

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        }

        loadMeeting();

        return () => {
            cancelled = true;
        };

    }, []);

    // =================================================
    // CREATE PEER CONNECTION
    // =================================================

    const createPeerConnection =
        useCallback(
            (
                socket: Socket,
                shouldCreateOffer: boolean
            ) => {

                // Reuse an existing connection.
                if (
                    peerConnectionRef.current
                ) {
                    return peerConnectionRef.current;
                }

                const peer =
                    new RTCPeerConnection(
                        ICE_SERVERS
                    );

                peerConnectionRef.current =
                    peer;

                // -----------------------------------------
                // LOCAL MEDIA TRACKS
                // -----------------------------------------

                const localStream =
                    localStreamRef.current;

                if (localStream) {

                    localStream
                        .getTracks()
                        .forEach(
                            (track) => {

                                peer.addTrack(
                                    track,
                                    localStream
                                );

                            }
                        );

                }

                // -----------------------------------------
                // REMOTE TRACK
                // -----------------------------------------

                peer.ontrack =
                    (event) => {

                        console.log(
                            "🎥 Remote track received:",
                            event.track.kind,
                            event.streams?.length || 0
                        );

                        let remoteStream =
                            event.streams?.[0];

                        if (!remoteStream) {
                            if (!remoteStreamRef.current) {
                                remoteStreamRef.current =
                                    new MediaStream();
                            }

                            remoteStream =
                                remoteStreamRef.current;

                            if (!remoteStream.getTracks().some(
                                (track) => track.id === event.track.id
                            )) {
                                remoteStream.addTrack(event.track);
                            }
                        } else {
                            remoteStreamRef.current = remoteStream;
                        }

                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                            remoteVideoRef.current.play().catch((error) => {
                                console.warn("Remote video autoplay warning:", error);
                            });
                        }

                        setRemoteConnected(true);
                        setConnectionStatus("Connected");
                    };

                // -----------------------------------------
                // ICE CANDIDATES
                // -----------------------------------------

                peer.onicecandidate =
                    (event) => {

                        if (
                            event.candidate &&
                            socket.connected
                        ) {

                            socket.emit(
                                "webrtc-ice-candidate",
                                {
                                    candidate:
                                        event.candidate
                                }
                            );

                        }

                    };

                // -----------------------------------------
                // CONNECTION STATE
                // -----------------------------------------

                peer.onconnectionstatechange =
                    () => {

                        console.log(
                            "WebRTC connection state:",
                            peer.connectionState
                        );

                        switch (
                            peer.connectionState
                        ) {

                            case "new":

                                setConnectionStatus(
                                    "Connecting..."
                                );

                                break;

                            case "connecting":

                                setConnectionStatus(
                                    "Connecting video..."
                                );

                                break;

                            case "connected":

                                setConnectionStatus(
                                    "Connected"
                                );

                                setRemoteConnected(
                                    true
                                );

                                break;

                            case "disconnected":

                                setConnectionStatus(
                                    "Connection interrupted"
                                );

                                setRemoteConnected(
                                    false
                                );

                                break;

                            case "failed":

                                setConnectionStatus(
                                    "Video connection failed"
                                );

                                setRemoteConnected(
                                    false
                                );

                                break;

                            case "closed":

                                setConnectionStatus(
                                    "Consultation ended"
                                );

                                setRemoteConnected(
                                    false
                                );

                                break;

                        }

                    };

                // -----------------------------------------
                // ICE CONNECTION STATE
                // -----------------------------------------

                peer.oniceconnectionstatechange =
                    () => {

                        console.log(
                            "ICE connection state:",
                            peer.iceConnectionState
                        );

                    };

                // -----------------------------------------
                // OFFER CREATION
                // -----------------------------------------

                if (
                    shouldCreateOffer
                ) {

                    void createOffer(
                        peer,
                        socket
                    );

                }

                return peer;

            },
            []
        );

    // =================================================
    // CREATE OFFER
    // =================================================

    const createOffer =
        useCallback(
            async (
                peer: RTCPeerConnection,
                socket: Socket
            ) => {

                if (
                    makingOfferRef.current
                ) {
                    return;
                }

                if (
                    peer.signalingState !==
                    "stable"
                ) {
                    return;
                }

                try {

                    makingOfferRef.current =
                        true;

                    console.log(
                        "📡 Creating WebRTC offer"
                    );

                    const offer =
                        await peer.createOffer();

                    await peer.setLocalDescription(
                        offer
                    );

                    socket.emit(
                        "webrtc-offer",
                        {
                            offer:
                                peer.localDescription
                        }
                    );

                } catch (err) {

                    console.error(
                        "Create offer error:",
                        err
                    );

                    setConnectionStatus(
                        "Unable to create video connection"
                    );

                } finally {

                    makingOfferRef.current =
                        false;

                }

            },
            []
        );

    // =================================================
    // START LOCAL MEDIA
    // =================================================

    const startLocalMedia =
        useCallback(
            async () => {

                if (
                    localStreamRef.current
                ) {

                    return localStreamRef.current;
                }

                if (
                    !navigator.mediaDevices ||
                    !navigator.mediaDevices.getUserMedia
                ) {

                    throw new Error(
                        "Camera and microphone access is not supported by this browser."
                    );

                }

                setConnectionStatus(
                    "Requesting camera and microphone..."
                );

                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        {
                            video: {
                                width: {
                                    ideal: 1280
                                },

                                height: {
                                    ideal: 720
                                },

                                facingMode:
                                    "user"
                            },

                            audio: true
                        }
                    );

                localStreamRef.current =
                    stream;

                if (
                    localVideoRef.current
                ) {

                    localVideoRef.current.srcObject =
                        stream;

                    localVideoRef.current
                        .play()
                        .catch(
                            () => {}
                        );

                }

                return stream;

            },
            []
        );

    // =================================================
    // JOIN SOCKET
    // =================================================

    const connectSocket =
        useCallback(
            async () => {

                const appointmentId =
                    appointmentIdRef.current;

                if (
                    !isLoggedIn() ||
                    !appointmentId
                ) {

                    throw new Error(
                        "Authentication or appointment information is missing."
                    );

                }

                const socket =
                    io(
                        SOCKET_URL,
                        {
                            transports: [
                                "websocket",
                                "polling"
                            ],

                            // HttpOnly auth cookie is sent
                            // automatically with the handshake;
                            // no token is read or passed from
                            // JavaScript.
                            withCredentials: true,

                            reconnection: true,

                            reconnectionAttempts:
                                5,

                            timeout:
                                10000
                        }
                    );

                socketRef.current =
                    socket;

                return new Promise<void>(
                    (
                        resolve,
                        reject
                    ) => {

                        let settled =
                            false;

                        // ---------------------------------
                        // SOCKET CONNECT
                        // ---------------------------------

                        socket.on(
                            "connect",
                            () => {

                                console.log(
                                    "🔌 Socket connected:",
                                    socket.id
                                );

                                setConnected(
                                    true
                                );

                                setConnectionStatus(
                                    "Joining consultation..."
                                );

                                // IMPORTANT:
                                // The browser sends ONLY the
                                // appointment ID.
                                //
                                // The server obtains the
                                // user identity from JWT.
                                socket.emit(
                                    "join-consultation",
                                    {
                                        appointmentId
                                    }
                                );

                            }
                        );

                        // ---------------------------------
                        // CONSULTATION JOINED
                        // ---------------------------------

                        socket.on(
                            "consultation-joined",
                            async (data) => {

                                console.log(
                                    "✅ Consultation joined:",
                                    data
                                );

                                if (
                                    !settled
                                ) {

                                    settled =
                                        true;

                                    resolve();

                                }

                                setConnectionStatus(
                                    "Waiting for the other participant..."
                                );

                                const participants =
                                    Array.isArray(
                                        data?.participants
                                    )
                                        ? data.participants
                                        : [];

                                const hasExistingParticipant =
                                    participants.length >
                                    0;

                                participantConnectedRef.current =
                                    hasExistingParticipant;

                                setParticipantConnected(
                                    hasExistingParticipant
                                );

                                // IMPORTANT:
                                // Only the participant who was ALREADY
                                // in the room creates the offer, via the
                                // participant-joined event below.
                                // The newly joined participant waits.
                                // Both sides create the peer connection here.
                                createPeerConnection(
                                    socket,
                                    false
                                );

                                if (hasExistingParticipant) {
                                    setConnectionStatus(
                                        "Waiting for video offer..."
                                    );
                                }

                            }
                        );

                        // ---------------------------------
                        // NEW PARTICIPANT JOINED
                        // ---------------------------------

                        socket.on(
                            "participant-joined",
                            async (participant) => {

                                console.log(
                                    "👤 Participant joined:",
                                    participant
                                );

                                participantConnectedRef.current =
                                    true;

                                setParticipantConnected(
                                    true
                                );

                                setConnectionStatus(
                                    "Connecting to participant..."
                                );

                                // This socket represents the
                                // participant who was already
                                // waiting in the room.
                                //
                                // Therefore THIS side creates
                                // the offer.
                                const peer =
                                    createPeerConnection(
                                        socket,
                                        false
                                    );

                                await createOffer(
                                    peer,
                                    socket
                                );

                            }
                        );

                        // ---------------------------------
                        // RECEIVE OFFER
                        // ---------------------------------

                        socket.on(
                            "webrtc-offer",
                            async (data) => {

                                console.log(
                                    "📡 WebRTC offer received"
                                );

                                try {

                                    let peer =
                                        peerConnectionRef.current;

                                    if (!peer) {

                                        peer =
                                            createPeerConnection(
                                                socket,
                                                false
                                            );

                                    }

                                    if (!data?.offer) {

                                        return;
                                    }

                                    await peer.setRemoteDescription(
                                        new RTCSessionDescription(
                                            data.offer
                                        )
                                    );

                                    // Apply ICE candidates that arrived before
                                    // the remote offer was available.
                                    const queuedCandidates =
                                        pendingIceCandidatesRef.current.splice(0);

                                    for (const candidate of queuedCandidates) {
                                        try {
                                            await peer.addIceCandidate(
                                                new RTCIceCandidate(candidate)
                                            );
                                        } catch (candidateError) {
                                            console.error(
                                                "Queued ICE candidate error:",
                                                candidateError
                                            );
                                        }
                                    }

                                    const answer =
                                        await peer.createAnswer();

                                    await peer.setLocalDescription(
                                        answer
                                    );

                                    socket.emit(
                                        "webrtc-answer",
                                        {
                                            answer:
                                                peer.localDescription
                                        }
                                    );

                                    setConnectionStatus(
                                        "Connecting video..."
                                    );

                                } catch (err) {

                                    console.error(
                                        "Offer handling error:",
                                        err
                                    );

                                    setConnectionStatus(
                                        "Unable to establish video connection"
                                    );

                                }

                            }
                        );

                        // ---------------------------------
                        // RECEIVE ANSWER
                        // ---------------------------------

                        socket.on(
                            "webrtc-answer",
                            async (data) => {

                                console.log(
                                    "📡 WebRTC answer received"
                                );

                                try {

                                    const peer =
                                        peerConnectionRef.current;

                                    if (
                                        !peer ||
                                        !data?.answer
                                    ) {
                                        return;
                                    }

                                    await peer.setRemoteDescription(
                                        new RTCSessionDescription(
                                            data.answer
                                        )
                                    );

                                    // Apply ICE candidates that arrived before
                                    // the remote answer was available.
                                    const queuedCandidates =
                                        pendingIceCandidatesRef.current.splice(0);

                                    for (const candidate of queuedCandidates) {
                                        try {
                                            await peer.addIceCandidate(
                                                new RTCIceCandidate(candidate)
                                            );
                                        } catch (candidateError) {
                                            console.error(
                                                "Queued ICE candidate error:",
                                                candidateError
                                            );
                                        }
                                    }

                                    setConnectionStatus(
                                        "Connecting video..."
                                    );

                                } catch (err) {

                                    console.error(
                                        "Answer handling error:",
                                        err
                                    );

                                }

                            }
                        );

                        // ---------------------------------
                        // RECEIVE ICE
                        // ---------------------------------

                        socket.on(
                            "webrtc-ice-candidate",
                            async (data) => {

                                try {

                                    const peer =
                                        peerConnectionRef.current;

                                    if (
                                        !peer ||
                                        !data?.candidate
                                    ) {
                                        return;
                                    }

                                    // Candidates may arrive before the remote
                                    // offer/answer. Queue them until SDP exists.
                                    if (!peer.remoteDescription) {
                                        pendingIceCandidatesRef.current.push(
                                            data.candidate
                                        );
                                        console.log("🧊 Queued ICE candidate");
                                        return;
                                    }

                                    await peer.addIceCandidate(
                                        new RTCIceCandidate(
                                            data.candidate
                                        )
                                    );

                                } catch (err) {

                                    console.error(
                                        "ICE candidate error:",
                                        err
                                    );

                                }

                            }
                        );

                        // ---------------------------------
                        // PARTICIPANT LEFT
                        // ---------------------------------

                        socket.on(
                            "participant-left",
                            () => {

                                console.log(
                                    "👋 Participant left"
                                );

                                participantConnectedRef.current =
                                    false;

                                setParticipantConnected(
                                    false
                                );

                                setRemoteConnected(
                                    false
                                );

                                pendingIceCandidatesRef.current = [];
                                remoteStreamRef.current = null;

                                if (
                                    remoteVideoRef.current
                                ) {

                                    remoteVideoRef.current.srcObject =
                                        null;

                                }

                                if (
                                    peerConnectionRef.current
                                ) {

                                    peerConnectionRef.current.close();

                                    peerConnectionRef.current =
                                        null;

                                }

                                setConnectionStatus(
                                    "The other participant has left."
                                );

                            }
                        );

                        // ---------------------------------
                        // SIGNALING ERROR
                        // ---------------------------------

                        socket.on(
                            "signaling-error",
                            (data) => {

                                console.error(
                                    "❌ Signaling error:",
                                    data
                                );

                                const message =
                                    data?.message ||
                                    "Unable to join consultation.";

                                setError(
                                    message
                                );

                                setConnectionStatus(
                                    message
                                );

                                if (
                                    !settled
                                ) {

                                    settled =
                                        true;

                                    reject(
                                        new Error(
                                            message
                                        )
                                    );

                                }

                            }
                        );

                        // ---------------------------------
                        // SOCKET ERROR
                        // ---------------------------------

                        socket.on(
                            "connect_error",
                            (err) => {

                                console.error(
                                    "❌ Socket connection error:",
                                    err
                                );

                                setConnected(
                                    false
                                );

                                setConnectionStatus(
                                    "Unable to connect to consultation server."
                                );

                                if (
                                    !settled
                                ) {

                                    settled =
                                        true;

                                    reject(
                                        err
                                    );

                                }

                            }
                        );

                        // ---------------------------------
                        // DISCONNECT
                        // ---------------------------------

                        socket.on(
                            "disconnect",
                            (reason) => {

                                console.log(
                                    "🔌 Socket disconnected:",
                                    reason
                                );

                                setConnected(
                                    false
                                );

                                if (
                                    mountedRef.current &&
                                    reason !==
                                        "io client disconnect"
                                ) {

                                    setConnectionStatus(
                                        "Connection lost. Reconnecting..."
                                    );

                                }

                            }
                        );

                    }
                );

            },
            [
                createPeerConnection,
                createOffer
            ]
        );

    // =================================================
    // JOIN CONSULTATION
    // =================================================

    const joinConsultation =
        useCallback(
            async () => {

                if (
                    joining
                ) {
                    return;
                }

                if (
                    !meeting
                ) {

                    setError(
                        "Consultation information is not available."
                    );

                    return;
                }

                if (
                    meeting.canJoin === false
                ) {

                    setError(
                        "The consultation is not open yet. Please join during the scheduled consultation window."
                    );

                    return;
                }

                try {

                    setJoining(
                        true
                    );

                    setError(
                        ""
                    );

                    setConnectionStatus(
                        "Starting consultation..."
                    );

                    await startLocalMedia();

                    await connectSocket();

                    setConnectionStatus(
                        "Waiting for participant..."
                    );

                } catch (err) {

                    console.error(
                        "Join consultation error:",
                        err
                    );

                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to join consultation."
                    );

                    // Cleanup if joining failed.
                    if (
                        socketRef.current
                    ) {

                        socketRef.current.disconnect();

                        socketRef.current =
                            null;

                    }

                    if (
                        localStreamRef.current
                    ) {

                        localStreamRef.current
                            .getTracks()
                            .forEach(
                                (track) =>
                                    track.stop()
                            );

                        localStreamRef.current =
                            null;

                    }

                    if (
                        localVideoRef.current
                    ) {

                        localVideoRef.current.srcObject =
                            null;

                    }

                } finally {

                    setJoining(
                        false
                    );

                }

            },
            [
                meeting,
                joining,
                startLocalMedia,
                connectSocket
            ]
        );

    // =================================================
    // CAMERA TOGGLE
    // =================================================

    const toggleCamera =
        useCallback(
            () => {

                const stream =
                    localStreamRef.current;

                if (!stream) {
                    return;
                }

                const videoTracks =
                    stream.getVideoTracks();

                if (
                    videoTracks.length === 0
                ) {
                    return;
                }

                const nextState =
                    !cameraEnabled;

                videoTracks.forEach(
                    (track) => {
                        track.enabled =
                            nextState;
                    }
                );

                setCameraEnabled(
                    nextState
                );

            },
            [cameraEnabled]
        );

    // =================================================
    // MICROPHONE TOGGLE
    // =================================================

    const toggleMicrophone =
        useCallback(
            () => {

                const stream =
                    localStreamRef.current;

                if (!stream) {
                    return;
                }

                const audioTracks =
                    stream.getAudioTracks();

                if (
                    audioTracks.length === 0
                ) {
                    return;
                }

                const nextState =
                    !micEnabled;

                audioTracks.forEach(
                    (track) => {
                        track.enabled =
                            nextState;
                    }
                );

                setMicEnabled(
                    nextState
                );

            },
            [micEnabled]
        );

    // =================================================
    // END CONSULTATION
    // =================================================

    const endConsultation =
        useCallback(
            () => {

                if (
                    ending
                ) {
                    return;
                }

                setEnding(
                    true
                );

                // Tell the server we are leaving.
                if (
                    socketRef.current
                ) {

                    socketRef.current.emit(
                        "leave-consultation"
                    );

                    socketRef.current.disconnect();

                    socketRef.current =
                        null;

                }

                pendingIceCandidatesRef.current = [];
                remoteStreamRef.current = null;

                // Close peer connection.
                if (
                    peerConnectionRef.current
                ) {

                    peerConnectionRef.current.close();

                    peerConnectionRef.current =
                        null;

                }

                // Stop camera and microphone.
                if (
                    localStreamRef.current
                ) {

                    localStreamRef.current
                        .getTracks()
                        .forEach(
                            (track) =>
                                track.stop()
                        );

                    localStreamRef.current =
                        null;

                }

                if (
                    localVideoRef.current
                ) {

                    localVideoRef.current.srcObject =
                        null;

                }

                if (
                    remoteVideoRef.current
                ) {

                    remoteVideoRef.current.srcObject =
                        null;

                }

                window.location.href =
                    "/dashboard/meetings";

            },
            [ending]
        );

    // =================================================
    // CLEANUP
    // =================================================

    useEffect(() => {

        mountedRef.current =
            true;

        return () => {

            mountedRef.current =
                false;

            if (
                socketRef.current
            ) {

                socketRef.current.emit(
                    "leave-consultation"
                );

                socketRef.current.disconnect();

                socketRef.current =
                    null;

            }

            pendingIceCandidatesRef.current = [];
            remoteStreamRef.current = null;

            if (
                peerConnectionRef.current
            ) {

                peerConnectionRef.current.close();

                peerConnectionRef.current =
                    null;

            }

            if (
                localStreamRef.current
            ) {

                localStreamRef.current
                    .getTracks()
                    .forEach(
                        (track) =>
                            track.stop()
                    );

                localStreamRef.current =
                    null;

            }

        };

    }, []);

    // =================================================
    // BACK BUTTON
    // =================================================

    const goBack =
        () => {

            if (
                socketRef.current ||
                localStreamRef.current
            ) {

                endConsultation();

                return;
            }

            window.location.href =
                "/dashboard/meetings";

        };

    // =================================================
    // LOADING
    // =================================================

    if (loading) {

        return (
            <div
                className="
                    min-h-screen
                    bg-black
                    text-white
                    flex
                    items-center
                    justify-center
                    p-6
                "
            >

                <div
                    className="
                        text-center
                        max-w-md
                    "
                >

                    <div
                        className="
                            mx-auto
                            mb-6
                            w-16
                            h-16
                            rounded-full
                            border
                            border-yellow-500/30
                            bg-yellow-500/10
                            flex
                            items-center
                            justify-center
                        "
                    >

                        <Loader2
                            className="
                                w-8
                                h-8
                                text-yellow-400
                                animate-spin
                            "
                        />

                    </div>

                    <h1
                        className="
                            text-2xl
                            font-bold
                            mb-2
                        "
                    >
                        Nyaya AI
                    </h1>

                    <p
                        className="
                            text-gray-400
                        "
                    >
                        Loading your consultation...
                    </p>

                </div>

            </div>
        );
    }

    // =================================================
    // ERROR SCREEN
    // =================================================

    if (error && !meeting) {

        return (
            <div
                className="
                    min-h-screen
                    bg-black
                    text-white
                    flex
                    items-center
                    justify-center
                    p-6
                "
            >

                <div
                    className="
                        w-full
                        max-w-lg
                        rounded-2xl
                        border
                        border-red-500/30
                        bg-gray-950
                        p-8
                        text-center
                    "
                >

                    <div
                        className="
                            mx-auto
                            mb-5
                            w-14
                            h-14
                            rounded-full
                            bg-red-500/10
                            flex
                            items-center
                            justify-center
                        "
                    >

                        <AlertCircle
                            className="
                                w-7
                                h-7
                                text-red-400
                            "
                        />

                    </div>

                    <h1
                        className="
                            text-2xl
                            font-bold
                            mb-3
                        "
                    >
                        Unable to open consultation
                    </h1>

                    <p
                        className="
                            text-gray-400
                            mb-6
                        "
                    >
                        {error}
                    </p>

                    <button
                        onClick={() =>
                            window.location.href =
                                "/dashboard/meetings"
                        }
                        className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-xl
                            px-5
                            py-3
                            bg-yellow-500
                            text-black
                            font-semibold
                            hover:bg-yellow-400
                            transition
                        "
                    >

                        <ArrowLeft
                            className="w-5 h-5"
                        />

                        Back to Meetings

                    </button>

                </div>

            </div>
        );
    }

    // =================================================
    // MAIN SCREEN
    // =================================================

    return (
        <div
            className="
                min-h-screen
                bg-black
                text-white
                flex
                flex-col
            "
        >

            {/* =========================================
                HEADER
            ========================================== */}

            <header
                className="
                    h-16
                    px-4
                    md:px-6
                    border-b
                    border-white/10
                    bg-gray-950
                    flex
                    items-center
                    justify-between
                    shrink-0
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <button
                        onClick={goBack}
                        className="
                            w-10
                            h-10
                            rounded-lg
                            hover:bg-white/10
                            flex
                            items-center
                            justify-center
                            transition
                        "
                        title="Back"
                    >

                        <ArrowLeft
                            className="w-5 h-5"
                        />

                    </button>

                    <div>

                        <div
                            className="
                                flex
                                items-center
                                gap-2
                            "
                        >

                            <Video
                                className="
                                    w-5
                                    h-5
                                    text-yellow-400
                                "
                            />

                            <h1
                                className="
                                    font-semibold
                                    text-lg
                                "
                            >
                                Nyaya AI Consultation
                            </h1>

                        </div>

                        <p
                            className="
                                text-xs
                                text-gray-500
                            "
                        >
                            Private in-app video consultation
                        </p>

                    </div>

                </div>

                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <div
                        className="
                            hidden
                            sm:flex
                            items-center
                            gap-2
                            text-xs
                            text-gray-400
                        "
                    >

                        <ShieldCheck
                            className="
                                w-4
                                h-4
                                text-green-400
                            "
                        />

                        Secure consultation

                    </div>

                    <div
                        className={`
                            flex
                            items-center
                            gap-2
                            px-3
                            py-1.5
                            rounded-full
                            text-xs
                            border
                            ${
                                connected
                                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                                    : "border-gray-700 bg-gray-900 text-gray-400"
                            }
                        `}
                    >

                        <span
                            className={`
                                w-2
                                h-2
                                rounded-full
                                ${
                                    connected
                                        ? "bg-green-400"
                                        : "bg-gray-500"
                                }
                            `}
                        />

                        {connected
                            ? "Connected"
                            : "Offline"}

                    </div>

                </div>

            </header>

            {/* =========================================
                CONTENT
            ========================================== */}

            <main
                className="
                    flex-1
                    flex
                    flex-col
                    min-h-0
                    p-3
                    md:p-5
                    gap-4
                "
            >

                {/* =====================================
                    CONSULTATION INFORMATION
                ====================================== */}

                <div
                    className="
                        rounded-xl
                        border
                        border-white/10
                        bg-gray-950
                        px-4
                        py-3
                        flex
                        flex-col
                        md:flex-row
                        md:items-center
                        md:justify-between
                        gap-3
                        shrink-0
                    "
                >

                    <div>

                        <p
                            className="
                                text-xs
                                uppercase
                                tracking-wider
                                text-gray-500
                            "
                        >
                            Consultation
                        </p>

                        <p
                            className="
                                text-sm
                                text-gray-200
                                mt-1
                            "
                        >
                            {meeting?.appointmentId
                                ? `Appointment #${meeting.appointmentId}`
                                : "Nyaya AI video consultation"}
                        </p>

                    </div>

                    <div
                        className="
                            flex
                            items-center
                            gap-2
                            text-sm
                            text-gray-400
                        "
                    >

                        <Users
                            className="
                                w-4
                                h-4
                            "
                        />

                        {participantConnected
                            ? "Advocate and citizen connected"
                            : "Waiting for participant"}

                    </div>

                    <div
                        className="
                            text-sm
                            text-gray-400
                        "
                    >
                        {formatMeetingDate(
                            meeting?.scheduledStart
                        )}
                    </div>

                </div>

                {/* =====================================
                    VIDEO AREA
                ====================================== */}

                <div
                    className="
                        flex-1
                        min-h-0
                        grid
                        grid-cols-1
                        md:grid-cols-2
                        gap-3
                    "
                >

                    {/* =================================
                        REMOTE VIDEO
                    ================================== */}

                    <div
                        className="
                            relative
                            min-h-[280px]
                            md:min-h-0
                            rounded-2xl
                            overflow-hidden
                            border
                            border-white/10
                            bg-gray-950
                        "
                    >

                        <video
                            ref={
                                remoteVideoRef
                            }
                            autoPlay
                            playsInline
                            className="
                                absolute
                                inset-0
                                w-full
                                h-full
                                object-cover
                                bg-black
                            "
                        />

                        {!remoteConnected && (

                            <div
                                className="
                                    absolute
                                    inset-0
                                    flex
                                    flex-col
                                    items-center
                                    justify-center
                                    bg-gray-950
                                    text-center
                                    p-6
                                "
                            >

                                <div
                                    className="
                                        w-16
                                        h-16
                                        rounded-full
                                        bg-yellow-500/10
                                        border
                                        border-yellow-500/20
                                        flex
                                        items-center
                                        justify-center
                                        mb-4
                                    "
                                >

                                    <Users
                                        className="
                                            w-8
                                            h-8
                                            text-yellow-400
                                        "
                                    />

                                </div>

                                <h2
                                    className="
                                        text-lg
                                        font-semibold
                                    "
                                >
                                    {participantConnected
                                        ? "Connecting video..."
                                        : "Waiting for participant"}
                                </h2>

                                <p
                                    className="
                                        mt-2
                                        text-sm
                                        text-gray-500
                                        max-w-sm
                                    "
                                >
                                    {connectionStatus}
                                </p>

                            </div>

                        )}

                        <div
                            className="
                                absolute
                                left-3
                                top-3
                                px-3
                                py-1.5
                                rounded-lg
                                bg-black/70
                                backdrop-blur
                                text-xs
                                text-white
                            "
                        >
                            Advocate / Citizen
                        </div>

                    </div>

                    {/* =================================
                        LOCAL VIDEO
                    ================================== */}

                    <div
                        className="
                            relative
                            min-h-[280px]
                            md:min-h-0
                            rounded-2xl
                            overflow-hidden
                            border
                            border-white/10
                            bg-gray-950
                        "
                    >

                        <video
                            ref={
                                localVideoRef
                            }
                            autoPlay
                            muted
                            playsInline
                            className="
                                absolute
                                inset-0
                                w-full
                                h-full
                                object-cover
                                bg-black
                                transform
                                scale-x-[-1]
                            "
                        />

                        {!localStreamRef.current && (

                            <div
                                className="
                                    absolute
                                    inset-0
                                    flex
                                    items-center
                                    justify-center
                                    text-gray-500
                                "
                            >

                                Camera preview

                            </div>

                        )}

                        <div
                            className="
                                absolute
                                left-3
                                top-3
                                px-3
                                py-1.5
                                rounded-lg
                                bg-black/70
                                backdrop-blur
                                text-xs
                                text-white
                            "
                        >
                            You
                        </div>

                        {!cameraEnabled && (

                            <div
                                className="
                                    absolute
                                    inset-0
                                    flex
                                    items-center
                                    justify-center
                                    bg-gray-950
                                "
                            >

                                <div
                                    className="
                                        text-center
                                    "
                                >

                                    <VideoOff
                                        className="
                                            w-10
                                            h-10
                                            mx-auto
                                            text-gray-500
                                        "
                                    />

                                    <p
                                        className="
                                            mt-2
                                            text-sm
                                            text-gray-500
                                        "
                                    >
                                        Camera off
                                    </p>

                                </div>

                            </div>

                        )}

                    </div>

                </div>

                {/* =====================================
                    ERROR
                ====================================== */}

                {error && (

                    <div
                        className="
                            rounded-xl
                            border
                            border-red-500/30
                            bg-red-500/10
                            px-4
                            py-3
                            flex
                            items-center
                            gap-3
                            shrink-0
                        "
                    >

                        <AlertCircle
                            className="
                                w-5
                                h-5
                                text-red-400
                                shrink-0
                            "
                        />

                        <p
                            className="
                                text-sm
                                text-red-300
                            "
                        >
                            {error}
                        </p>

                    </div>

                )}

                {/* =====================================
                    STATUS
                ====================================== */}

                <div
                    className="
                        text-center
                        text-sm
                        text-gray-400
                        shrink-0
                    "
                >
                    {connectionStatus}
                </div>

                {/* =====================================
                    CONTROLS
                ====================================== */}

                <div
                    className="
                        flex
                        items-center
                        justify-center
                        gap-3
                        shrink-0
                    "
                >

                    {!connected && !localStreamRef.current && (

                        <button
                            onClick={
                                joinConsultation
                            }
                            disabled={
                                joining ||
                                meeting?.canJoin === false
                            }
                            className="
                                inline-flex
                                items-center
                                gap-2
                                px-6
                                py-3
                                rounded-xl
                                bg-yellow-500
                                text-black
                                font-semibold
                                hover:bg-yellow-400
                                disabled:opacity-50
                                disabled:cursor-not-allowed
                                transition
                            "
                        >

                            {joining ? (

                                <>

                                    <Loader2
                                        className="
                                            w-5
                                            h-5
                                            animate-spin
                                        "
                                    />

                                    Joining...

                                </>

                            ) : (

                                <>

                                    <Video
                                        className="
                                            w-5
                                            h-5
                                        "
                                    />

                                    Join Consultation

                                </>

                            )}

                        </button>

                    )}

                    {localStreamRef.current && (

                        <>

                            {/* MICROPHONE */}

                            <button
                                onClick={
                                    toggleMicrophone
                                }
                                className={`
                                    w-12
                                    h-12
                                    rounded-full
                                    flex
                                    items-center
                                    justify-center
                                    transition
                                    ${
                                        micEnabled
                                            ? "bg-gray-800 hover:bg-gray-700"
                                            : "bg-red-500 hover:bg-red-400"
                                    }
                                `}
                                title={
                                    micEnabled
                                        ? "Mute microphone"
                                        : "Unmute microphone"
                                }
                            >

                                {micEnabled ? (

                                    <Mic
                                        className="
                                            w-5
                                            h-5
                                        "
                                    />

                                ) : (

                                    <MicOff
                                        className="
                                            w-5
                                            h-5
                                        "
                                    />

                                )}

                            </button>

                            {/* CAMERA */}

                            <button
                                onClick={
                                    toggleCamera
                                }
                                className={`
                                    w-12
                                    h-12
                                    rounded-full
                                    flex
                                    items-center
                                    justify-center
                                    transition
                                    ${
                                        cameraEnabled
                                            ? "bg-gray-800 hover:bg-gray-700"
                                            : "bg-red-500 hover:bg-red-400"
                                    }
                                `}
                                title={
                                    cameraEnabled
                                        ? "Turn camera off"
                                        : "Turn camera on"
                                }
                            >

                                {cameraEnabled ? (

                                    <Video
                                        className="
                                            w-5
                                            h-5
                                        "
                                    />

                                ) : (

                                    <VideoOff
                                        className="
                                            w-5
                                            h-5
                                        "
                                    />

                                )}

                            </button>

                            {/* END */}

                            <button
                                onClick={
                                    endConsultation
                                }
                                disabled={
                                    ending
                                }
                                className="
                                    w-14
                                    h-12
                                    rounded-full
                                    bg-red-600
                                    hover:bg-red-500
                                    disabled:opacity-50
                                    flex
                                    items-center
                                    justify-center
                                    transition
                                "
                                title="End consultation"
                            >

                                <PhoneOff
                                    className="
                                        w-5
                                        h-5
                                    "
                                />

                            </button>

                        </>

                    )}

                </div>

            </main>

            {/* =========================================
                FOOTER
            ========================================== */}

            <footer
                className="
                    h-10
                    border-t
                    border-white/10
                    bg-gray-950
                    flex
                    items-center
                    justify-center
                    shrink-0
                    px-4
                "
            >

                <p
                    className="
                        text-xs
                        text-gray-600
                        text-center
                    "
                >
                    Nyaya AI • Private in-app consultation
                    • Do not share your consultation link
                </p>

            </footer>

        </div>
    );
}