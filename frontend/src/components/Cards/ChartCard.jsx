import React from 'react'

const ChartCard = ({ title, subtitle, value, change }) => {
  return (
    <div className="bg-white rounded-2xl border border-primary-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-primary-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-emerald-600 font-medium">↑ {change}</p>
        </div>
      </div>
      
      {/* Simple chart placeholder */}
      <div className="h-48 flex items-end space-x-1">
        {[40, 60, 80, 60, 40, 70, 90, 60, 50, 80].map((height, index) => (
          <div
            key={index}
            className="flex-1 bg-gradient-to-t from-secondary-400 to-secondary-500 rounded-t"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-4 text-sm text-primary-500">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
        <span>Sep</span>
        <span>Oct</span>
      </div>
    </div>
  )
}

export default ChartCard