import Heading from '../element/Heading';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { storeApi } from '@/systems/store/lib/api';

export interface ReceivedRecord {
    id: number;
    timestamp?: string;
    indentNumber?: string;
    poDate?: string;
    poNumber?: string;
    vendor?: string;
    receivedStatus?: string;
    receivedQuantity?: string;
    uom?: string;
    photoOfProduct?: string;
    warrantyStatus?: string;
    endDate?: string;
    billStatus?: string;
    billNumber?: string;
    billAmount?: string;
    photoOfBill?: string;
    anyTransportations?: string;
    transporterName?: string;
    transportingAmount?: string;
}

const emptyFormState = {
    indentNumber: '',
    poDate: '',
    poNumber: '',
    vendor: '',
    receivedStatus: 'Received',
    receivedQuantity: '',
    uom: '',
    photoOfProduct: '',
    warrantyStatus: '',
    endDate: '',
    billStatus: '',
    billNumber: '',
    billAmount: '',
    photoOfBill: '',
    anyTransportations: '',
    transporterName: '',
    transportingAmount: '',
};

export default function Received() {
    const [tableData, setTableData] = useState<ReceivedRecord[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyFormState);

    const fetchData = async () => {
        try {
            setDataLoading(true);
            const res = await storeApi.get('received');
            setTableData(res.data || []);
        } catch (error: any) {
            console.error('Error fetching received records:', error);
            toast.error(error?.message || 'Failed to fetch received records');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await storeApi.post('received', {
                ...formData,
                timestamp: new Date().toISOString(),
            });
            toast.success('Received record added successfully');
            setOpenDialog(false);
            setFormData(emptyFormState);
            fetchData();
        } catch (error: any) {
            console.error('Error creating received record:', error);
            toast.error(error?.message || 'Failed to add received record');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns: ColumnDef<ReceivedRecord>[] = useMemo(
        () => [
            {
                id: 'srNo',
                header: 'SR No.',
                cell: ({ row }) => <div className="text-center font-medium">{row.index + 1}</div>,
            },
            {
                accessorKey: 'indentNumber',
                header: 'Indent No.',
                cell: ({ row }) => <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.original.indentNumber || '-'}</div>,
            },
            {
                accessorKey: 'poNumber',
                header: 'PO No.',
                cell: ({ row }) => <div>{row.original.poNumber || '-'}</div>,
            },
            {
                accessorKey: 'poDate',
                header: 'PO Date',
                cell: ({ row }) => <div>{row.original.poDate || '-'}</div>,
            },
            {
                accessorKey: 'vendor',
                header: 'Vendor',
                cell: ({ row }) => <div>{row.original.vendor || '-'}</div>,
            },
            {
                accessorKey: 'receivedStatus',
                header: 'Status',
                cell: ({ row }) => (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {row.original.receivedStatus || 'Received'}
                    </span>
                ),
            },
            {
                accessorKey: 'receivedQuantity',
                header: 'Rec. Qty',
                cell: ({ row }) => <div className="font-semibold text-emerald-700 dark:text-emerald-400">{row.original.receivedQuantity || '-'}</div>,
            },
            {
                accessorKey: 'uom',
                header: 'UOM',
                cell: ({ row }) => <div>{row.original.uom || '-'}</div>,
            },
            {
                accessorKey: 'billNumber',
                header: 'Bill No.',
                cell: ({ row }) => <div>{row.original.billNumber || '-'}</div>,
            },
            {
                accessorKey: 'billAmount',
                header: 'Bill Amount',
                cell: ({ row }) => <div>{row.original.billAmount ? `₹${row.original.billAmount}` : '-'}</div>,
            },
            {
                accessorKey: 'billStatus',
                header: 'Bill Status',
                cell: ({ row }) => <div>{row.original.billStatus || '-'}</div>,
            },
            {
                accessorKey: 'warrantyStatus',
                header: 'Warranty',
                cell: ({ row }) => <div>{row.original.warrantyStatus || '-'}</div>,
            },
            {
                accessorKey: 'transporterName',
                header: 'Transporter',
                cell: ({ row }) => <div>{row.original.transporterName || '-'}</div>,
            },
            {
                accessorKey: 'transportingAmount',
                header: 'Freight Amt',
                cell: ({ row }) => <div>{row.original.transportingAmount ? `₹${row.original.transportingAmount}` : '-'}</div>,
            },
        ],
        []
    );

    const searchFields = [
        'indentNumber',
        'poNumber',
        'vendor',
        'receivedStatus',
        'receivedQuantity',
        'uom',
        'billNumber',
        'billStatus',
        'transporterName',
    ];

    const extraActions = (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={dataLoading}
                title="Refresh Data"
            >
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg"
                onClick={() => setOpenDialog(true)}
            >
                <Plus className="h-4 w-4" />
                Add Received Record
            </Button>
        </div>
    );

    return (
        <div>
            <Heading heading="Received Store Items" subtext="View and add received inventory records for Refrasynth Store">
                <CheckCircle2 size={50} className="text-primary" />
            </Heading>

            <DataTable
                data={tableData}
                columns={columns}
                searchFields={searchFields}
                dataLoading={dataLoading}
                extraActions={extraActions}
            />

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            Add New Received Record
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-2">
                        {/* Section 1: PO & Item Details */}
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                                PO & Receipt Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Indent Number</label>
                                    <Input
                                        name="indentNumber"
                                        value={formData.indentNumber}
                                        onChange={handleChange}
                                        placeholder="e.g. IND-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">PO Number</label>
                                    <Input
                                        name="poNumber"
                                        value={formData.poNumber}
                                        onChange={handleChange}
                                        placeholder="e.g. PO-2026-01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">PO Date</label>
                                    <Input
                                        name="poDate"
                                        type="date"
                                        value={formData.poDate}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor</label>
                                    <Input
                                        name="vendor"
                                        value={formData.vendor}
                                        onChange={handleChange}
                                        placeholder="Vendor Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Received Status</label>
                                    <Input
                                        name="receivedStatus"
                                        value={formData.receivedStatus}
                                        onChange={handleChange}
                                        placeholder="e.g. Received"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Received Quantity</label>
                                    <Input
                                        name="receivedQuantity"
                                        value={formData.receivedQuantity}
                                        onChange={handleChange}
                                        placeholder="e.g. 100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">UOM</label>
                                    <Input
                                        name="uom"
                                        value={formData.uom}
                                        onChange={handleChange}
                                        placeholder="e.g. MT / Nos"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Photo of Product (URL)</label>
                                    <Input
                                        name="photoOfProduct"
                                        value={formData.photoOfProduct}
                                        onChange={handleChange}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Warranty Status</label>
                                    <Input
                                        name="warrantyStatus"
                                        value={formData.warrantyStatus}
                                        onChange={handleChange}
                                        placeholder="e.g. 1 Year Warranty"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Bill & Freight Info */}
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                                Bill & Freight Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Status</label>
                                    <Input
                                        name="billStatus"
                                        value={formData.billStatus}
                                        onChange={handleChange}
                                        placeholder="e.g. Bill Received"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Number</label>
                                    <Input
                                        name="billNumber"
                                        value={formData.billNumber}
                                        onChange={handleChange}
                                        placeholder="e.g. INV-990"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bill Amount (₹)</label>
                                    <Input
                                        name="billAmount"
                                        type="number"
                                        value={formData.billAmount}
                                        onChange={handleChange}
                                        placeholder="e.g. 45000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Transporter Name</label>
                                    <Input
                                        name="transporterName"
                                        value={formData.transporterName}
                                        onChange={handleChange}
                                        placeholder="Transporter Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Freight Amount (₹)</label>
                                    <Input
                                        name="transportingAmount"
                                        type="number"
                                        value={formData.transportingAmount}
                                        onChange={handleChange}
                                        placeholder="e.g. 2500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Photo of Bill (URL)</label>
                                    <Input
                                        name="photoOfBill"
                                        value={formData.photoOfBill}
                                        onChange={handleChange}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenDialog(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Received Record'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
