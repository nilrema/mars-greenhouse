import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const SensorChart = ({ data, metric, title, color = '#8884d8' }) => {
  if (!data || data.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>{title}</h3>
        <div style={styles.noData}>No data available</div>
      </div>
    );
  }

  // Format data for the chart
  const chartData = data.map((item, index) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    value: item[metric] || 0,
    fullTime: new Date(item.timestamp).toLocaleTimeString(),
  }));

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey="time" 
              stroke="#888"
              tick={{ fill: '#ccc' }}
              axisLine={{ stroke: '#666' }}
            />
            <YAxis 
              stroke="#888"
              tick={{ fill: '#ccc' }}
              axisLine={{ stroke: '#666' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e1e1e', 
                border: '1px solid #444',
                borderRadius: '4px'
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={2}
              name={title}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #333',
  },
  title: {
    color: '#fff',
    marginBottom: '15px',
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  chartContainer: {
    height: '300px',
    width: '100%',
  },
  noData: {
    color: '#888',
    textAlign: 'center',
    padding: '40px 0',
    fontStyle: 'italic',
  },
};

export default SensorChart;