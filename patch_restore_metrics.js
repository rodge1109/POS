import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const targetRegex = /\/\/ Calculate previous period for trends[\s\S]+setMetrics\(\{[\s\S]+?\}\);/;

const replacement = `// Calculate previous period for trends
          let prevStartDate = new Date(startDate);
          let prevEndDate = new Date(startDate);
          if (timeframe === 'today') {
            prevStartDate.setDate(prevStartDate.getDate() - 1);
          } else if (timeframe === 'week') {
            prevStartDate.setDate(prevStartDate.getDate() - 7);
          } else if (timeframe === 'month') {
            prevStartDate.setMonth(prevStartDate.getMonth() - 1);
          } else {
            prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
          }

          const prevOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= prevStartDate && orderDate < prevEndDate;
          });

          // Current period metrics
          const totalRevenue = filteredOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
          const totalOrders = filteredOrders.length;
          const totalItems = filteredOrders.reduce((sum, o) => sum + (o.items?.length || 1), 0);
          const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
          const avgOrderSize = totalOrders > 0 ? totalItems / totalOrders : 0;

          // Previous period metrics
          const prevTotalRevenue = prevOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
          const prevTotalOrders = prevOrders.length;
          const prevTotalItems = prevOrders.reduce((sum, o) => sum + (o.items?.length || 1), 0);
          const prevAvgOrderValue = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
          const prevAvgOrderSize = prevTotalOrders > 0 ? prevTotalItems / prevTotalOrders : 0;

          const calculateTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? { direction: 'up', percent: '100' } : { direction: 'steady', percent: '0' };
            const diff = ((current - previous) / previous) * 100;
            if (Math.abs(diff) < 0.01) return { direction: 'steady', percent: '0' };
            return {
              direction: diff > 0 ? 'up' : 'down',
              percent: Math.abs(diff).toFixed(1)
            };
          };

          // Calculate total discounts and identify active customers in this period
          let totalDiscounts = 0;
          const activeCustomerIds = new Set();
          filteredOrders.forEach(o => {
            totalDiscounts += parseFloat(o.discount_amount || 0);
            if (o.customer_id) activeCustomerIds.add(o.customer_id);
          });

          // Accurate New vs Returning Logic
          let newCustomersCount = 0;
          let returningCustomersCount = 0;
          activeCustomerIds.forEach(cid => {
            const cust = allCustomers.find(c => c.id === cid);
            if (cust && new Date(cust.created_at) >= startDate) {
              newCustomersCount++;
            } else {
              returningCustomersCount++;
            }
          });

          const uniqueCustomersInTimeframe = activeCustomerIds.size;
          const ltvValue = uniqueCustomersInTimeframe > 0 ? totalRevenue / uniqueCustomersInTimeframe : 0;
          const cacValue = newCustomersCount > 0 ? totalDiscounts / newCustomersCount : 0;
          const retentionRate = uniqueCustomersInTimeframe > 0 ? (returningCustomersCount / uniqueCustomersInTimeframe) * 100 : 0;

          setCustomerMetrics({
            newCustomers: newCustomersCount,
            returningCustomers: returningCustomersCount,
            ltv: convertAmount(ltvValue),
            cac: convertAmount(cacValue),
            retention: retentionRate.toFixed(1)
          });

          // Calculate average service time (in minutes)
          const servedOrders = filteredOrders.filter(o => o.served_at && o.created_at);
          let avgServiceTime = 0;
          if (servedOrders.length > 0) {
            const totalMinutes = servedOrders.reduce((sum, o) => {
              const diff = new Date(o.served_at) - new Date(o.created_at);
              return sum + (diff / 1000 / 60);
            }, 0);
            avgServiceTime = (totalMinutes / servedOrders.length).toFixed(1);
          }

          setMetrics({
            totalRevenue,
            avgOrderValue,
            totalOrders,
            avgOrderSize: parseFloat(avgOrderSize).toFixed(1),
            avgServiceTime,
            trends: {
              revenue: calculateTrend(totalRevenue, prevTotalRevenue),
              orders: calculateTrend(totalOrders, prevTotalOrders),
              aov: calculateTrend(avgOrderValue, prevAvgOrderValue),
              size: calculateTrend(avgOrderSize, prevAvgOrderSize)
            }
          });`;

if (content.match(targetRegex)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Metrics logic restored and trend sensitivity fixed!');
} else {
  console.log('Could not find metrics block to replace.');
}
