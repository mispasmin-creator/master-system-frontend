import { FreightPayment } from "../types";
import { Truck, Clock, AlertTriangle, CheckCircle2, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import { formatDelayDuration } from "../lib/delay";

interface SummaryCardsProps {
  payments: FreightPayment[];
}

export function SummaryCards({ payments }: SummaryCardsProps) {
  const totalShipments = payments.length;
  const totalAmount = payments.reduce((acc, p) => acc + (p.Amount || 0), 0);
  const delayedShipments = payments.filter(p => (p.Delay || 0) > 0 || (p.Delay2 || 0) > 0 || (p.Delay3 || 0) > 0).length;
  const avgDelay = (payments.reduce((acc, p) => acc + (p.Delay || 0), 0) / (totalShipments || 1)).toFixed(1);

  const stats = [
    {
      label: "Total Shipments",
      value: totalShipments,
      icon: Truck,
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      change: "+12%",
      changeUp: true,
    },
    {
      label: "Total Revenue",
      value: `₹${(totalAmount / 1000).toFixed(1)}k`,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      change: "+8.2%",
      changeUp: true,
    },
    {
      label: "Delayed Orders",
      value: delayedShipments,
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      change: "-3",
      changeUp: false,
    },
    {
      label: "Avg Delay",
      value: formatDelayDuration(Number(avgDelay)),
      icon: Clock,
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      change: "-0.5d",
      changeUp: false,
    }
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05
          }
        }
      }}
      className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4"
    >
      {stats.map((stat, i) => (
        <motion.div 
          key={i} 
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
          }}
          whileHover={{ 
            y: -5, 
            scale: 1.015,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
          }}
          className="bg-white border border-slate-200/60 p-5 flex flex-col gap-3 relative overflow-hidden group shadow-sm transition-all duration-300 rounded-2xl cursor-default"
        >
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl ${stat.iconBg} ${stat.iconColor} transition-transform duration-300 group-hover:scale-110`}>
              <stat.icon className="w-[18px] h-[18px]" />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-bold ${stat.changeUp ? "text-emerald-600" : "text-amber-600"}`}>
              {stat.changeUp 
                ? <ArrowUpRight className="w-3 h-3" /> 
                : <ArrowDownRight className="w-3 h-3" />
              }
              {stat.change}
            </div>
          </div>

          {/* Value */}
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">{stat.label}</div>
          </div>

          {/* Progress bar decoration */}
          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
            <div 
              className={`bg-gradient-to-r ${stat.gradient} h-1 rounded-full transition-all duration-700`} 
              style={{ width: `${Math.min(60 + i * 10, 90)}%` }} 
            />
          </div>

          {/* Background decoration */}
          <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none">
            <stat.icon className="w-28 h-28" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
