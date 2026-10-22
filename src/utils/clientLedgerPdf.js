import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateClientLedgerPDF = (booking, ledgerRows, company = {}) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const primaryColor = [245, 158, 11]; // Amber / Gold
    const darkColor = [15, 23, 42];      // Slate 900
    const textMuted = [100, 116, 139];   // Slate 500
    const lightBg = [248, 250, 252];     // Slate 50

    // Top Brand Accent Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // 1. Header Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...darkColor);
    doc.text(company?.name || 'LOGKARO FLEET', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    let companyInfo = [];
    if (company?.whatsappNumber) companyInfo.push(`Tel: ${company.whatsappNumber}`);
    if (company?.email) companyInfo.push(`Email: ${company.email}`);
    if (company?.gstNumber) companyInfo.push(`GSTIN: ${company.gstNumber}`);
    if (companyInfo.length > 0) {
        doc.text(companyInfo.join('  |  '), 14, 24);
    }

    // Right side - Badge
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - 85, 10, 71, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text('CLIENT PAYMENT STATEMENT', pageWidth - 80, 17);
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.text(booking.bookingCode || booking.bookingId || 'BOOKING', pageWidth - 80, 23);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, pageWidth - 14, 32);

    // 2. Client & Trip Summary Box
    doc.setFillColor(...lightBg);
    doc.roundedRect(14, 36, pageWidth - 28, 32, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 36, pageWidth - 28, 32, 3, 3, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Client Name:', 20, 44);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.clientName || 'Guest', 45, 44);

    doc.setFont('helvetica', 'bold');
    doc.text('Mobile:', 20, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.mobileNumber || booking.phone || '—', 45, 52);

    doc.setFont('helvetica', 'bold');
    doc.text('Vehicle:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.vehicleType || 'Standard', 45, 60);

    const sDate = booking.tripStartFormatted || (booking.travelStartDate ? new Date(booking.travelStartDate).toLocaleDateString('en-GB') : '—');
    const eDate = booking.tripEndFormatted || (booking.travelEndDate ? new Date(booking.travelEndDate).toLocaleDateString('en-GB') : '—');

    doc.setFont('helvetica', 'bold');
    doc.text('Trip Start:', 110, 44);
    doc.setFont('helvetica', 'normal');
    doc.text(sDate, 132, 44);

    doc.setFont('helvetica', 'bold');
    doc.text('Trip End:', 110, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(eDate, 132, 52);

    doc.setFont('helvetica', 'bold');
    doc.text('Package Fare:', 110, 60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text(`Rs. ${(booking.totalAmount || 0).toLocaleString('en-IN')}`, 135, 60);

    // 3. Statement Table
    const tableHeaders = [
        ['Date', 'Particulars / Description', 'Package Fare (Rs.)', 'Paid / Received (Rs.)', 'Balance Due (Rs.)', 'Payment Mode']
    ];

    const tableData = ledgerRows.map(r => [
        r.date,
        r.particulars,
        r.fare ? `Rs. ${Number(r.fare).toLocaleString('en-IN')}` : '—',
        r.paid ? `Rs. ${Number(r.paid).toLocaleString('en-IN')}` : '—',
        `Rs. ${Number(r.balance).toLocaleString('en-IN')}`,
        r.mode
    ]);

    autoTable(doc, {
        startY: 74,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center',
            cellPadding: 4
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
            cellPadding: 3.5
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 24 },
            1: { cellWidth: 'auto' },
            2: { halign: 'right', cellWidth: 32 },
            3: { halign: 'right', cellWidth: 34, fontStyle: 'bold', textColor: [16, 185, 129] },
            4: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
            5: { halign: 'center', cellWidth: 30 }
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        }
    });

    const finalY = (doc.lastAutoTable?.finalY || 110) + 10;

    // 4. Financial Summary Cards
    const totalFare = Number(booking.totalAmount) || 0;
    const rowsPaidSum = (ledgerRows || []).reduce((acc, r) => acc + (Number(r.paid) || 0), 0);
    const fuelAmt = booking.guestFuelFilled ? (Number(booking.guestFuelAmount) || 0) : 0;
    const totalPaid = Math.max((Number(booking.advancePaid) || 0) + fuelAmt, rowsPaidSum);
    const balanceDue = booking.balanceDue !== undefined ? Number(booking.balanceDue) : Math.max(0, totalFare - totalPaid);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - 95, finalY, 81, 32, 2, 2, 'F');

    doc.setFontSize(8.5);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Package Fare:', pageWidth - 90, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${totalFare.toLocaleString('en-IN')}`, pageWidth - 20, finalY + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Total Received:', pageWidth - 90, finalY + 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${totalPaid.toLocaleString('en-IN')}`, pageWidth - 20, finalY + 16, { align: 'right' });

    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Balance Outstanding:', pageWidth - 90, finalY + 25);
    doc.setFont('helvetica', 'bold');
    if (balanceDue <= 0) {
        doc.setTextColor(16, 185, 129);
    } else {
        doc.setTextColor(239, 68, 68);
    }
    doc.text(`Rs. ${balanceDue.toLocaleString('en-IN')}`, pageWidth - 20, finalY + 25, { align: 'right' });

    // Status stamp
    if (balanceDue <= 0) {
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.text('PAID', 20, finalY + 16);
    } else {
        doc.setFontSize(10);
        doc.setTextColor(239, 68, 68);
        doc.setFont('helvetica', 'bold');
        doc.text(`PAYMENT PENDING: Rs. ${balanceDue.toLocaleString('en-IN')}`, 20, finalY + 16);
    }

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')} • Thank you for your business!`, 14, pageHeight - 10);

    const filename = `Client_Statement_${booking.bookingCode || booking.bookingId || 'booking'}.pdf`;
    doc.save(filename);
};
