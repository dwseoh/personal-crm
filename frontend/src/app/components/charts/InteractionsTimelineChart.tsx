"use client";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface InteractionTimelineData {
    date: string;
    count: number;
}

interface InteractionsTimelineChartProps {
    data: InteractionTimelineData[];
}

export default function InteractionsTimelineChart({ data }: InteractionsTimelineChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-base-content mb-4">Interactions Over Time</h3>
                <div className="flex items-center justify-center h-64 text-base-content opacity-50">
                    <p className="text-sm">No interaction data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-base-200 border border-base-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-base-content mb-4">Interactions Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                    <XAxis
                        dataKey="date"
                        stroke="currentColor"
                        opacity={0.7}
                        fontSize={12}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                    />
                    <YAxis stroke="currentColor" opacity={0.7} fontSize={12} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--color-base-200)",
                            border: "1px solid var(--color-base-300)",
                            borderRadius: "0.5rem",
                            color: "var(--color-base-content)",
                        }}
                        labelFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString();
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={{ fill: "var(--color-primary)", r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
