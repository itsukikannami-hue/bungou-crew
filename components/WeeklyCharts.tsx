"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts"

interface WeeklyChartsProps {
  weeklyTime: { date: string; minutes: number }[]
  weeklyWords: { date: string; words: number }[]
}

export default function WeeklyCharts({ weeklyTime, weeklyWords }: WeeklyChartsProps) {
  const GOAL_MINUTES_PER_WEEK = 180

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-2">週間執筆時間</h2>
      <BarChart width={350} height={200} data={weeklyTime}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar
          dataKey="minutes"
          fill="#8884d8"
          shape={(props: any) => {
            const { x, y, width, height, payload } = props
            const color = payload.minutes >= GOAL_MINUTES_PER_WEEK / 7 ? "#4caf50" : "#8884d8"
            return <rect x={x} y={y} width={width} height={height} fill={color} />
          }}
        />
        <ReferenceLine y={GOAL_MINUTES_PER_WEEK / 7} stroke="red" strokeDasharray="3 3" />
      </BarChart>

      <h2 className="text-xl font-bold mt-10 mb-2">週間文字数</h2>
      <BarChart width={350} height={200} data={weeklyWords}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="words" fill="#8884d8" />
      </BarChart>
    </div>
  )
}