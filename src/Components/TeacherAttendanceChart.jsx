import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#16a34a", "#f59e0b", "#f97316", "#2563eb", "#dc2626"];

const TeacherAttendanceChart = ({ breakdown }) => {
  const data = [
    { name: "On Time", value: breakdown?.["On Time"] || 0 },
    { name: "Late", value: breakdown?.Late || 0 },
    { name: "Half Day", value: breakdown?.["Half Day"] || 0 },
    { name: "Leave", value: breakdown?.Leave || 0 },
    { name: "Absent", value: breakdown?.Absent || 0 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-[320px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Monthly Attendance Mix</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TeacherAttendanceChart;
