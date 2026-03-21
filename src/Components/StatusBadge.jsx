import React from "react";

const statusClassMap = {
  "On Time": "bg-green-100 text-green-700 border-green-200",
  Late: "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Half Day": "bg-orange-100 text-orange-700 border-orange-200",
  Leave: "bg-blue-100 text-blue-700 border-blue-200",
  Absent: "bg-red-100 text-red-700 border-red-200",
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

const StatusBadge = ({ status }) => {
  const className =
    statusClassMap[status] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
      {status || "-"}
    </span>
  );
};

export default StatusBadge;
