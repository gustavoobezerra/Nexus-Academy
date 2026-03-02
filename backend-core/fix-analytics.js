const fs = require('fs');
let c = fs.readFileSync('src/controllers/analyticsController.js', 'utf8');
let start = c.indexOf('    const status = await Promise.all');
let end = c.indexOf('}));', start) + 4;
const newCode = `    const studentIds = students.map(s => s._id);
    const latestPayments = await Payment.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $sort: { dueDate: -1 } },
      { $group: { _id: '$student', status: { $first: '$status' }, dueDate: { $first: '$dueDate' }, paidAt: { $first: '$paidAt' } } }
    ]);
    const paymentMap = {};
    latestPayments.forEach(p => { paymentMap[p._id.toString()] = p; });

    const status = students.map(student => {
      const latestPayment = paymentMap[student._id.toString()];
      return {
        studentId: student._id,
        studentName: student.name,
        monthlyFee: student.monthlyFee,
        currentStatus: latestPayment?.status || 'pending',
        daysOverdue: latestPayment?.status === 'late' && latestPayment?.dueDate
          ? Math.max(0, Math.floor((Date.now() - new Date(latestPayment.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 0,
        lastPaymentDate: latestPayment?.paidAt || null
      };
    });`;
c = c.substring(0, start) + newCode + c.substring(end);
fs.writeFileSync('src/controllers/analyticsController.js', c);
console.log('done');
