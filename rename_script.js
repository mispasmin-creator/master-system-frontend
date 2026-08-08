const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'systems', 'purchase', 'components');

const map = [
  { old: 'Dashboard.jsx', new: 'Dashboard.jsx', label: 'Dashboard' },
  { old: 'IndentForm.jsx', new: 'Indent.jsx', label: 'Indent' },
  { old: 'StockApproval.jsx', new: 'HODApproval.jsx', label: 'HOD Approval' },
  { old: 'ThreeParty.jsx', new: 'ThreeParty.jsx', label: 'Three Party' },
  { old: 'FactoryApprovals.jsx', new: 'FactoryApp.jsx', label: 'Factory App.' },
  { old: 'ManagementApprovals.jsx', new: 'MgmtApp.jsx', label: 'Mgmt App.' },
  { old: 'generate-po.jsx', new: 'MakePO.jsx', label: 'Make PO' },
  { old: 'POHistory.jsx', new: 'POHistory.jsx', label: 'PO History' },
  { old: 'ArrangeLogistics.jsx', new: 'ArrangeLogistics.jsx', label: 'Arrange Logistics' },
  { old: 'LogisticsApproval.jsx', new: 'LogisticsApp.jsx', label: 'Logistics App.' },
  { old: 'tally-entry.jsx', new: 'POEntry.jsx', label: 'PO Entry' },
  { old: 'Originals-billto-fill.jsx', new: 'AdvancePayment.jsx', label: 'Advance Payement' },
  { old: 'lift-material.jsx', new: 'Lift.jsx', label: 'Lift' },
  { old: 'receipt-check.jsx', new: 'Receipt.jsx', label: 'Receipt' },
  { old: 'ManagementUnloadApproval.jsx', new: 'UnloadApp.jsx', label: 'Unload App.' },
  { old: 'lab-testing.jsx', new: 'Lab.jsx', label: 'Lab' },
  { old: 'LabReportPage.jsx', new: 'LabReport.jsx', label: 'Lab Report' },
  { old: 'BiltyPage.jsx', new: 'Bilty.jsx', label: 'Bilty' },
  { old: 'Mis-match.jsx', new: 'Mismatch.jsx', label: 'Mismatch' },
  { old: 'PurchaseReturnPage.jsx', new: 'PurchaseReturn.jsx', label: 'Purchase Return' },
  { old: 'PurchaserCoordinate.jsx', new: 'PurchaserCoord.jsx', label: 'Purchaser Coord.' },
  { old: 'Audit-data.jsx', new: 'AccountsAudit.jsx', label: 'Accounts Audit' },
  { old: 'Debit-note.jsx', new: 'DebitNote.jsx', label: 'Debit Note' },
  { old: 'FullkittingTransportingPage.jsx', new: 'Fullkitting.jsx', label: 'Fullkitting' },
  { old: 'TatReportPage.jsx', new: 'TATDelayReport.jsx', label: 'TAT & Delay Report' },
  { old: 'ManageUsers.jsx', new: 'ManageUsers.jsx', label: 'Manage Users' }
];

async function run() {
  for (const item of map) {
    const oldPath = path.join(componentsDir, item.old);
    const newPath = path.join(componentsDir, item.new);
    
    if (fs.existsSync(oldPath)) {
      let content = fs.readFileSync(oldPath, 'utf8');
      
      // ONLY replace the FIRST <CardTitle> match!
      content = content.replace(/(<CardTitle[^>]*>)([\s\S]*?)(<\/CardTitle>)/, (match, open, inner, close) => {
        // Find if there's an icon component inside (starts with capital letter or <svg)
        const iconMatch = inner.match(/(<[A-Z][a-zA-Z]*[^>]*>|<svg[^>]*>[\s\S]*?<\/svg>)/);
        const icon = iconMatch ? iconMatch[0] : '';
        return `${open}\n            ${icon}\n            ${item.label}\n          ${close}`;
      });

      // Remove CardDescription completely (all of them, usually just one as a subheading)
      content = content.replace(/<CardDescription[^>]*>[\s\S]*?<\/CardDescription>/g, '');

      // Sometimes they use <h1 class="text-2xl font-bold">...</h1> instead
      // We only replace the first one
      content = content.replace(/(<h1[^>]*text-2xl[^>]*>)([\s\S]*?)(<\/h1>)/, (match, open, inner, close) => {
        return `${open}${item.label}${close}`;
      });

      // Write updated content to new path
      fs.writeFileSync(newPath, content);
      
      // Remove old file if name changed
      if (item.old !== item.new) {
        fs.unlinkSync(oldPath);
      }
      console.log(`Processed ${item.old} -> ${item.new}`);
    } else {
      console.log(`File not found: ${oldPath}`);
    }
  }
}

run();
