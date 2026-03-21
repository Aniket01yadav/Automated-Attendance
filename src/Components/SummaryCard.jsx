import React from "react";

const SummaryCard = ({ label, value, valueClass = "text-blue-700" }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
  );
};

export default SummaryCard;
