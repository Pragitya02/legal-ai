import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";

const BACKEND_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5001";

interface AdvocateRatingProps {
    advocateId: number | string;
    className?: string;
}

export default function AdvocateRating({
    advocateId,
    className = "",
}: AdvocateRatingProps) {
    const [average, setAverage] = useState(0);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadRating() {
            try {
                const response = await fetch(
                    `${BACKEND_URL}/api/feedback/advocates/${encodeURIComponent(
                        String(advocateId)
                    )}/summary`,
                    {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    }
                );

                const data = await response.json();

                if (!cancelled && response.ok && data?.success) {
                    setAverage(Number(data.averageRating || 0));
                    setCount(Number(data.reviewCount || 0));
                }
            } catch (error) {
                console.warn("Unable to load advocate rating:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadRating();

        return () => {
            cancelled = true;
        };
    }, [advocateId]);

    if (loading) {
        return (
            <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
                Rating...
            </span>
        );
    }

    if (!count) {
        return (
            <span className={`inline-flex items-center gap-1 text-sm text-gray-500 ${className}`}>
                New advocate
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{average.toFixed(1)}</span>
            <span className="text-gray-500">({count})</span>
        </span>
    );
}
