import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const StatCard = ({ title, value, change, icon: Icon, color, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-primary-200 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-500 mb-2">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <div className="flex items-center mt-2">
            <ArrowUpRight size={16} className="text-emerald-500 mr-1" />
            <span className="text-sm text-emerald-600 font-medium">{change}</span>
            <span className="text-sm text-primary-400 ml-2">from last month</span>
          </div>
        </div>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </motion.div>
  )
}

export default StatCard