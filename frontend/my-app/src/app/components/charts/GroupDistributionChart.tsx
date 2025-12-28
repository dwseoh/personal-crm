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
                <PieChart
                    style={{ color: "oklch(var(--bc))" }} // 👈 SVG currentColor source
                >
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent = 0 }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                        }
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color ?? `hsl(${index * 45}, 70%, 50%)`}
                            />
                        ))}
                    </Pie>

                    <Tooltip
                        contentStyle={{
                            backgroundColor: "oklch(var(--b2))",
                            border: "1px solid oklch(var(--bc) / 0.2)",
                            borderRadius: "8px",
                            color: "oklch(var(--bc))", // 👈 tooltip text
                        }}
                        labelStyle={{
                            color: "oklch(var(--bc) / 0.7)",
                        }}
                        itemStyle={{
                            color: "oklch(var(--bc))",
                        }}
                    />

                    <Legend />

                    {/* Center total */}
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="currentColor"
                        className="text-2xl font-bold"
                    >
                        {totalContacts}
                    </text>

                    <text
                        x="50%"
                        y="55%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="currentColor"
                        className="text-xs opacity-70"
                    >
                        contacts
                    </text>
                </PieChart>
            </ResponsiveContainer>


        </div>
    );
}
