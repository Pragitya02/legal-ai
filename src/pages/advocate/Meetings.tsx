import React, { useEffect, useState } from 'react';
import { isLoggedIn } from '../../lib/auth';
import {
  Video,
  Calendar,
  Clock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface Meeting {
  id: number;
  appointment_id: number;
  room_name: string;
  scheduled_start: string;
  scheduled_end: string;
  citizen_name?: string;
  client_name?: string;
  status?: string;
  mode?: string;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getMeetingState(start: string, end: string) {
  const now = new Date();
  const startTime = new Date(start);
  const endTime = new Date(end);

  const joinTime = new Date(startTime.getTime() - 10 * 60 * 1000);

  if (now < joinTime) {
    const minutes = Math.ceil(
      (joinTime.getTime() - now.getTime()) / 60000
    );

    return {
      type: 'upcoming',
      label: `Join available in ${minutes} minute${
        minutes === 1 ? '' : 's'
      }`,
    };
  }

  if (now >= joinTime && now <= endTime) {
    return {
      type: 'live',
      label: 'Meeting is available',
    };
  }

  return {
    type: 'ended',
    label: 'Meeting ended',
  };
}

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMeetings = async () => {
    try {
      setLoading(true);
      setError('');

      if (!isLoggedIn()) {
        setError('Please log in to view your meetings.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/meetings`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load meetings.'
        );
      }

      const meetingList = Array.isArray(data)
        ? data
        : data.meetings || data.data || [];

      setMeetings(meetingList);
    } catch (err: any) {
      console.error('Failed to load meetings:', err);
      setError(err.message || 'Unable to load meetings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();

    const interval = setInterval(
      loadMeetings,
      60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const joinMeeting = (appointmentId: number) => {
    window.location.href = `/meeting/${appointmentId}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, #f5dc75, #d4af37)',
                boxShadow:
                  '0 0 20px rgba(212,175,55,0.15)',
              }}
            >
              <Video size={22} color="#000" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Meetings
              </h1>

              <p
                className="text-sm"
                style={{ color: '#b5b5b5' }}
              >
                Your scheduled video consultations
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2
              size={34}
              className="animate-spin"
              style={{ color: '#d4af37' }}
            />

            <p
              className="mt-4 text-sm"
              style={{ color: '#b5b5b5' }}
            >
              Loading your meetings...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="rounded-2xl p-5 flex items-start gap-4"
            style={{
              background: '#0b0b0b',
              border:
                '1px solid rgba(212,175,55,0.25)',
            }}
          >
            <AlertCircle
              size={22}
              style={{
                color: '#d4af37',
                flexShrink: 0,
              }}
            />

            <div>
              <h3 className="font-semibold mb-1">
                Unable to load meetings
              </h3>

              <p
                className="text-sm"
                style={{ color: '#b5b5b5' }}
              >
                {error}
              </p>

              <button
                onClick={loadMeetings}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: '#d4af37',
                  color: '#000',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          meetings.length === 0 && (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: '#0b0b0b',
                border:
                  '1px solid rgba(212,175,55,0.20)',
              }}
            >
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5"
                style={{
                  background:
                    'rgba(212,175,55,0.08)',
                  border:
                    '1px solid rgba(212,175,55,0.20)',
                }}
              >
                <Video
                  size={28}
                  style={{ color: '#d4af37' }}
                />
              </div>

              <h2 className="text-xl font-semibold mb-2">
                No meetings yet
              </h2>

              <p
                className="text-sm max-w-md mx-auto"
                style={{ color: '#b5b5b5' }}
              >
                Accepted video consultation appointments
                will appear here.
              </p>
            </div>
          )}

        {/* Meetings */}
        {!loading &&
          !error &&
          meetings.length > 0 && (
            <div className="space-y-5">
              {meetings.map((meeting) => {
                const meetingState =
                  getMeetingState(
                    meeting.scheduled_start,
                    meeting.scheduled_end
                  );

                const clientName =
                  meeting.citizen_name ||
                  meeting.client_name ||
                  'Client';

                return (
                  <div
                    key={meeting.id}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: '#0b0b0b',
                      border:
                        '1px solid rgba(212,175,55,0.20)',
                    }}
                  >
                    <div className="p-6">

                      {/* Top */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">

                        <div className="flex items-start gap-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{
                              background:
                                'linear-gradient(135deg, #f5dc75, #d4af37)',
                            }}
                          >
                            <User
                              size={23}
                              color="#000"
                            />
                          </div>

                          <div>
                            <p
                              className="text-xs uppercase tracking-wider mb-1"
                              style={{
                                color: '#b5b5b5',
                              }}
                            >
                              Client
                            </p>

                            <h2 className="text-xl font-semibold">
                              {clientName}
                            </h2>

                            <div className="flex items-center gap-2 mt-2">
                              <Video
                                size={15}
                                style={{
                                  color: '#d4af37',
                                }}
                              />

                              <span
                                className="text-sm"
                                style={{
                                  color: '#b5b5b5',
                                }}
                              >
                                Video Consultation
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          {meetingState.type ===
                            'live' && (
                            <span
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold"
                              style={{
                                background:
                                  'rgba(34,197,94,0.10)',
                                color: '#4ade80',
                                border:
                                  '1px solid rgba(34,197,94,0.25)',
                              }}
                            >
                              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                              LIVE
                            </span>
                          )}

                          {meetingState.type ===
                            'upcoming' && (
                            <span
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold"
                              style={{
                                background:
                                  'rgba(212,175,55,0.08)',
                                color: '#d4af37',
                                border:
                                  '1px solid rgba(212,175,55,0.25)',
                              }}
                            >
                              <Clock size={13} />
                              UPCOMING
                            </span>
                          )}

                          {meetingState.type ===
                            'ended' && (
                            <span
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold"
                              style={{
                                background:
                                  'rgba(255,255,255,0.05)',
                                color: '#999',
                                border:
                                  '1px solid rgba(255,255,255,0.10)',
                              }}
                            >
                              <CheckCircle2
                                size={13}
                              />
                              ENDED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7 p-4 rounded-xl"
                        style={{
                          background: '#080808',
                          border:
                            '1px solid rgba(212,175,55,0.12)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar
                            size={19}
                            style={{
                              color: '#d4af37',
                            }}
                          />

                          <div>
                            <p
                              className="text-xs"
                              style={{
                                color: '#777',
                              }}
                            >
                              Date
                            </p>

                            <p className="text-sm font-medium">
                              {formatDate(
                                meeting.scheduled_start
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Clock
                            size={19}
                            style={{
                              color: '#d4af37',
                            }}
                          />

                          <div>
                            <p
                              className="text-xs"
                              style={{
                                color: '#777',
                              }}
                            >
                              Time
                            </p>

                            <p className="text-sm font-medium">
                              {formatTime(
                                meeting.scheduled_start
                              )}{' '}
                              –{' '}
                              {formatTime(
                                meeting.scheduled_end
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Video
                            size={19}
                            style={{
                              color: '#d4af37',
                            }}
                          />

                          <div>
                            <p
                              className="text-xs"
                              style={{
                                color: '#777',
                              }}
                            >
                              Meeting type
                            </p>

                            <p className="text-sm font-medium">
                              Online Video Call
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Join section */}
                      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                        <div className="flex items-center gap-3">
                          {meetingState.type ===
                          'live' ? (
                            <CheckCircle2
                              size={19}
                              style={{
                                color: '#4ade80',
                              }}
                            />
                          ) : meetingState.type ===
                            'upcoming' ? (
                            <Lock
                              size={19}
                              style={{
                                color: '#d4af37',
                              }}
                            />
                          ) : (
                            <CheckCircle2
                              size={19}
                              style={{
                                color: '#777',
                              }}
                            />
                          )}

                          <div>
                            <p className="text-sm font-medium">
                              {meetingState.label}
                            </p>

                            {meetingState.type ===
                              'upcoming' && (
                              <p
                                className="text-xs mt-1"
                                style={{
                                  color: '#777',
                                }}
                              >
                                You can join up to
                                10 minutes before
                                the scheduled start.
                              </p>
                            )}
                          </div>
                        </div>

                        {meetingState.type ===
                          'live' && (
                          <button
                            onClick={() =>
                              joinMeeting(
                                meeting.appointment_id
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all"
                            style={{
                              background:
                                'linear-gradient(135deg, #f5dc75, #d4af37)',
                              color: '#000',
                              boxShadow:
                                '0 0 25px rgba(212,175,55,0.18)',
                            }}
                          >
                            <Video size={18} />
                            Join Meeting
                            <ExternalLink
                              size={15}
                            />
                          </button>
                        )}

                        {meetingState.type ===
                          'upcoming' && (
                          <button
                            disabled
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold opacity-50 cursor-not-allowed"
                            style={{
                              background: '#222',
                              color: '#aaa',
                              border:
                                '1px solid rgba(255,255,255,0.10)',
                            }}
                          >
                            <Lock size={17} />
                            Not Available Yet
                          </button>
                        )}

                        {meetingState.type ===
                          'ended' && (
                          <button
                            disabled
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold opacity-40 cursor-not-allowed"
                            style={{
                              background: '#222',
                              color: '#aaa',
                            }}
                          >
                            Meeting Ended
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}