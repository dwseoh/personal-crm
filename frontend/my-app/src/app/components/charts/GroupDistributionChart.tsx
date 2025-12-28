"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { GroupDistribution } from "@/types/interactions";

interface GroupDistributionChartProps {
    data: GroupDistribution[];
    totalContacts: number;
}

export default function GroupDistributionChart({
    data,
    totalContacts,
}: GroupDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-base-content mb-4">
                    Group Distribution
                </h3>
                <div className="flex items-center justify-center h-64 text-base-content opacity-70">
                    <p className="text-sm">No group data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-base-200 border border-base-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-base-content mb-4">
                Group Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                        }
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color || `hsl(${index * 45}, 70%, 50%)`}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--fallback-b2,oklch(var(--b2)))",
                            border: "1px solid var(--fallback-bc,oklch(var(--bc)/0.2))",
                            borderRadius: "8px",
                        }}
                    />
                    <Legend />
                    {/* Center text showing total */}
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-2xl font-bold fill-base-content"
                    >
                        {totalContacts}
                    </text>
                    <text
                        x="50%"
                        y="55%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs fill-base-content opacity-70"
                    >
                        contacts
                    </text>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
