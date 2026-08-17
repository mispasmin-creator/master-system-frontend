import Heading from '../element/Heading';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Layers, Plus, RefreshCw } from 'lucide-react';
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

export interface StockRecord {
    id: number;
    timestamp?: string;
    serialNumber?: string;
    groupHead?: string;
    productName?: string;
    uom?: string;
    opening?: string;
    minLevel?: string;
    latestPrice?: string;
    intransit?: string;
    received?: string;
    consumed?: string;
    currentStock?: string;
    value?: string;
    required?: string;
    condition?: string;
}

const emptyFormState = {
    serialNumber: '',
    groupHead: '',
    productName: '',
    uom: '',
    opening: '',
    minLevel: '',
    latestPrice: '',
    intransit: '',
    received: '',
    consumed: '',
    currentStock: '',
    value: '',
    required: '',
    condition: 'Good',
};

export default function Stock() {
    const [tableData, setTableData] = useState<StockRecord[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyFormState);

    const fetchData = async () => {
        try {
            setDataLoading(true);
            const res = await storeApi.get('stock');
            setTableData(res.data || []);
        } catch (error: any) {
            console.error('Error fetching stock records:', error);
            toast.error(error?.message || 'Failed to fetch stock records');
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
        if (!formData.productName.trim()) {
            toast.error('Product Name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await storeApi.post('stock', {
                ...formData,
                timestamp: new Date().toISOString(),
            });
            toast.success('Stock record added successfully');
            setOpenDialog(false);
            setFormData(emptyFormState);
            fetchData();
        } catch (error: any) {
            console.error('Error creating stock record:', error);
            toast.error(error?.message || 'Failed to add stock record');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns: ColumnDef<StockRecord>[] = useMemo(
        () => [
            {
                id: 'srNo',
                header: 'SR No.',
                cell: ({ row }) => <div className="text-center font-medium">{row.index + 1}</div>,
            },
            {
                accessorKey: 'serialNumber',
                header: 'Serial No.',
                cell: ({ row }) => <div>{row.original.serialNumber || '-'}</div>,
            },
            {
                accessorKey: 'productName',
                header: 'Product Name',
                cell: ({ row }) => <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.original.productName || '-'}</div>,
            },
            {
                accessorKey: 'groupHead',
                header: 'Group Head',
                cell: ({ row }) => <div>{row.original.groupHead || '-'}</div>,
            },
            {
                accessorKey: 'uom',
                header: 'UOM',
                cell: ({ row }) => <div>{row.original.uom || '-'}</div>,
            },
            {
                accessorKey: 'currentStock',
                header: 'Current Stock',
                cell: ({ row }) => <div className="font-bold text-emerald-700 dark:text-emerald-400">{row.original.currentStock || '0'}</div>,
            },
            {
                accessorKey: 'opening',
                header: 'Opening',
                cell: ({ row }) => <div>{row.original.opening || '0'}</div>,
            },
            {
                accessorKey: 'minLevel',
                header: 'Min Level',
                cell: ({ row }) => <div>{row.original.minLevel || '0'}</div>,
            },
            {
                accessorKey: 'latestPrice',
                header: 'Latest Price',
                cell: ({ row }) => <div>{row.original.latestPrice ? `₹${row.original.latestPrice}` : '-'}</div>,
            },
            {
                accessorKey: 'intransit',
                header: 'In-Transit',
                cell: ({ row }) => <div>{row.original.intransit || '0'}</div>,
            },
            {
                accessorKey: 'received',
                header: 'Received',
                cell: ({ row }) => <div>{row.original.received || '0'}</div>,
            },
            {
                accessorKey: 'consumed',
                header: 'Consumed',
                cell: ({ row }) => <div>{row.original.consumed || '0'}</div>,
            },
            {
                accessorKey: 'value',
                header: 'Stock Value',
                cell: ({ row }) => <div>{row.original.value ? `₹${row.original.value}` : '-'}</div>,
            },
            {
                accessorKey: 'required',
                header: 'Required',
                cell: ({ row }) => <div>{row.original.required || '0'}</div>,
            },
            {
                accessorKey: 'condition',
                header: 'Condition',
                cell: ({ row }) => <div>{row.original.condition || 'Good'}</div>,
            },
        ],
        []
    );

    const searchFields = [
        'serialNumber',
        'groupHead',
        'productName',
        'uom',
        'currentStock',
        'condition',
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
                Add Stock Record
            </Button>
        </div>
    );

    return (
        <div>
            <Heading heading="Refrasynth Stock" subtext="Manage & view stock levels for Refrasynth Store">
                <Layers size={50} className="text-primary" />
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
                            Add New Stock Record
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-2">
                        {/* Section 1: Product Specifications */}
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                                Item Identification
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                        Product Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        name="productName"
                                        value={formData.productName}
                                        onChange={handleChange}
                                        placeholder="Product Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Serial Number</label>
                                    <Input
                                        name="serialNumber"
                                        value={formData.serialNumber}
                                        onChange={handleChange}
                                        placeholder="SN-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Group Head</label>
                                    <Input
                                        name="groupHead"
                                        value={formData.groupHead}
                                        onChange={handleChange}
                                        placeholder="Group Head"
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
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Condition</label>
                                    <Input
                                        name="condition"
                                        value={formData.condition}
                                        onChange={handleChange}
                                        placeholder="e.g. Good"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Latest Price (₹)</label>
                                    <Input
                                        name="latestPrice"
                                        type="number"
                                        value={formData.latestPrice}
                                        onChange={handleChange}
                                        placeholder="e.g. 45000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Stock Levels & Quantities */}
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                                Stock Quantities & Valuation
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Current Stock</label>
                                    <Input
                                        name="currentStock"
                                        value={formData.currentStock}
                                        onChange={handleChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Opening Stock</label>
                                    <Input
                                        name="opening"
                                        value={formData.opening}
                                        onChange={handleChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Min Level</label>
                                    <Input
                                        name="minLevel"
                                        value={formData.minLevel}
                                        onChange={handleChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">In-Transit</label>
                                    <Input
                                        name="intransit"
                                        value={formData.intransit}
                                        onChange={handleChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Received</label>
                                    <Input
                                        name="received"
                                        value={formData.received}
                                        onChange={handleChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Consumed</label>
                                    <Input
                                        name="consumed"
                                        value={formData.consumed}
                                        onChange={handleChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Required</label>
                                    <Input
                                        name="required"
                                        value={formData.required}
                                        onChange={handleChange}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Total Stock Value (₹)</label>
                                    <Input
                                        name="value"
                                        type="number"
                                        value={formData.value}
                                        onChange={handleChange}
                                        placeholder="e.g. 6300000"
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
                                {isSubmitting ? 'Saving...' : 'Save Stock Record'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
