import type { LegacyColumnDef as ColumnDef, LegacyRow as Row } from '@tanstack/react-table/legacy';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { useEffect, useState } from 'react';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PuffLoader as Loader } from 'react-spinners';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Users } from 'lucide-react';
import { Tabs, TabsContent } from '../ui/tabs';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Input } from '../ui/input';
import { storeApi } from '@/systems/store/lib/api';

interface RateApprovalData {
    id: number;
    indentNo: string;
    indenter: string;
    department: string;
    product: string;
    comparisonSheet: string;
    vendors: string[][];
    date: string;
    firmNameMatch?: string;
    plannedDate: string;
    quantity: number;
    uom: string;
    areaOfUse: string;
}

interface HistoryData {
    id: number;
    indentNo: string;
    indenter: string;
    department: string;
    firmNameMatch: string;
    product: string;
    vendor: [string, string];
    date: string;
    rank: string;
    quantity: number;
    uom: string;
    areaOfUse: string;
}

const extractRateVendors = (r: any): string[][] => {
    const rawList: string[][] = [];
    if (r.vendor_quotation?.vendor_name1 && r.vendor_quotation.vendor_name1.trim() !== '') {
        rawList.push([
            r.vendor_quotation.vendor_name1,
            (r.vendor_quotation.rate1 || 0).toString(),
            r.vendor_quotation.payment_term1 || '',
            'Basic Rate',
            'No',
            '0',
            '',
            '',
            r.technical_approval?.vendor1_rank || '',
            '',
            '',
            '',
            '',
        ]);
    }
    if (r.vendor_quotation?.vendor_name2 && r.vendor_quotation.vendor_name2.trim() !== '') {
        rawList.push([
            r.vendor_quotation.vendor_name2,
            (r.vendor_quotation.rate2 || 0).toString(),
            r.vendor_quotation.payment_term2 || '',
            'Basic Rate',
            'No',
            '0',
            '',
            '',
            r.technical_approval?.vendor2_rank || '',
            '',
            '',
            '',
            '',
        ]);
    }
    if (r.vendor_quotation?.vendor_name3 && r.vendor_quotation.vendor_name3.trim() !== '') {
        rawList.push([
            r.vendor_quotation.vendor_name3,
            (r.vendor_quotation.rate3 || 0).toString(),
            r.vendor_quotation.payment_term3 || '',
            'Basic Rate',
            'No',
            '0',
            '',
            '',
            r.technical_approval?.vendor3_rank || '',
            '',
            '',
            '',
            '',
        ]);
    }

    if (rawList.length === 0) {
        rawList.push([
            r.vendor_quotation?.vendor_name1 || '',
            (r.vendor_quotation?.rate1 || 0).toString(),
            r.vendor_quotation?.payment_term1 || '',
            'Basic Rate',
            'No',
            '0',
            '',
            '',
            r.technical_approval?.vendor1_rank || '',
            '',
            '',
            '',
            '',
        ]);
    }

    return rawList;
};

export default () => {
    const { user } = useAuth();

    const [selectedIndent, setSelectedIndent] = useState<RateApprovalData | null>(null);
    const [selectedHistory, setSelectedHistory] = useState<HistoryData | null>(null);
    const [tableData, setTableData] = useState<RateApprovalData[]>([]);
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    // Fetch pending three party approvals from Supabase
    const fetchPendingApprovals = async () => {
        try {
            setDataLoading(true);
            const { data } = await storeApi.get('indent');
            const indents = data || [];

            const filtered = indents.filter((row: any) => {
                const hasTechnicalApproval = !!row.technical_approval;
                const noManagementApprovalYet = !row.management_approval?.approved_vendor_name;
                const validVendorType = row.vendor_quotation?.vendor_type !== 'Reject';

                let matchFirm = true;
                if (user?.firmNameMatch && user.firmNameMatch.toLowerCase() !== 'all') {
                    const itemFirm = (row.firm_name_match || row.firm_name || row.firmNameMatch || row.firmName || '').trim().toLowerCase();
                    matchFirm = itemFirm === user.firmNameMatch.trim().toLowerCase();
                }

                return hasTechnicalApproval && noManagementApprovalYet && validVendorType && matchFirm;
            });

            filtered.sort((a: any, b: any) => String(b.indent_number || b.indentNumber || '').localeCompare(String(a.indent_number || a.indentNumber || '')));

            const rows = filtered as any[];
            setTableData(
                rows.map((r): RateApprovalData => ({
                    id: r.id,
                    indentNo: r.indent_number || r.indentNumber || '',
                    firmNameMatch: r.firm_name_match || r.firm_name || r.firmNameMatch || r.firmName || '',
                    indenter: r.indenter_name || r.indenterName || '',
                    department: r.category || r.department || '',
                    product: r.product_name || r.productName || '',
                    comparisonSheet: r.vendor_quotation?.comparison_sheet || '',
                    date: r.timestamp ? formatDateTime(new Date(r.timestamp)).replace(/\//g, '-') : '-',
                    plannedDate: r.technical_approval?.created_at ? formatDate(new Date(r.technical_approval.created_at)) : 'Not Set',
                    quantity: Number(r.indent_approval?.approved_quantity || r.quantity || 0),
                    uom: r.uom || '',
                    areaOfUse: r.area_of_use || r.areaOfUse || '',
                    vendors: extractRateVendors(r),
                }))
            );
        } catch (err) {
            console.error('Error fetching pending approvals:', err);
            toast.error('Failed to fetch pending approvals');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingApprovals();
    }, [user?.firmNameMatch]);


    // Fetch completed three party approvals from Supabase
    const fetchCompletedApprovals = async () => {
        try {
            setDataLoading(true);
            const { data } = await storeApi.get('indent');
            const indents = data || [];

            const filtered = indents.filter((row: any) => {
                const hasApprovedVendor = Boolean(row.management_approval?.approved_vendor_name);
                const validVendorType = row.vendor_quotation?.vendor_type !== 'Reject';

                let matchFirm = true;
                if (user?.firmNameMatch && user.firmNameMatch.toLowerCase() !== 'all') {
                    const itemFirm = (row.firm_name_match || row.firm_name || row.firmNameMatch || row.firmName || '').trim().toLowerCase();
                    matchFirm = itemFirm === user.firmNameMatch.trim().toLowerCase();
                }

                return hasApprovedVendor && validVendorType && matchFirm;
            });

            filtered.sort((a: any, b: any) => String(b.indent_number || b.indentNumber || '').localeCompare(String(a.indent_number || a.indentNumber || '')));

            const rows = filtered as any[];
            setHistoryData(
                rows.map((r): HistoryData => ({
                    id: r.id,
                    indentNo: r.indent_number || r.indentNumber || '',
                    firmNameMatch: r.firm_name_match || r.firm_name || r.firmNameMatch || r.firmName || '',
                    indenter: r.indenter_name || r.indenterName || '',
                    department: r.category || r.department || '',
                    product: r.product_name || r.productName || '',
                    date: r.management_approval?.created_at ? formatDate(new Date(r.management_approval.created_at)) : (r.timestamp ? formatDateTime(new Date(r.timestamp)).replace(/\//g, '-') : '-'),
                    vendor: [r.management_approval?.approved_vendor_name || '', (r.management_approval?.approved_rate || 0).toString()],
                    rank: '',
                    quantity: Number(r.indent_approval?.approved_quantity || r.quantity || 0),
                    uom: r.uom || '',
                    areaOfUse: r.area_of_use || r.areaOfUse || '',
                }))
            );
        } catch (err) {
            console.error('Error fetching completed approvals:', err);
            toast.error('Failed to fetch completed approvals');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingApprovals();
        fetchCompletedApprovals();
    }, [user?.firmNameMatch]);

    const columns: ColumnDef<RateApprovalData>[] = [
        {
            header: 'Action',
            id: 'action',
            cell: ({ row }: { row: Row<RateApprovalData> }) => {
                const indent = row.original;

                return (
                    <div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedHistory(null);
                                setSelectedIndent(indent);
                                setOpenDialog(true);
                            }}
                        >
                            Approve
                        </Button>
                    </div>
                );
            },
        },
        { accessorKey: 'date', header: 'Timestamp' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'firmNameMatch', header: 'Firm Name' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Category' },
        { accessorKey: 'product', header: 'Product' },
        { accessorKey: 'quantity', header: 'Quantity' },
        { accessorKey: 'uom', header: 'UOM' },
        { accessorKey: 'areaOfUse', header: 'Area of Use' },
        {
            accessorKey: 'plannedDate',
            header: 'Planned Date', // ✅ ADD THIS COLUMN
            cell: ({ getValue }) => {
                const plannedDate = getValue() as string;
                return (
                    <div className={`${plannedDate === 'Not Set' ? 'text-muted-foreground italic' : ''}`}>
                        {plannedDate}
                    </div>
                );
            }
        },
        {
            accessorKey: 'vendors',
            header: 'Vendors',
            cell: ({ row }) => {
                const vendors = row.original.vendors.filter(v => v[0] && v[0].trim() !== '');
                return (
                    <div className="grid place-items-center">
                        <div className="flex flex-col gap-1">
                            {vendors.map((vendor, index) => (
                                <span key={index} className="rounded-full text-xs px-3 py-1 bg-accent text-accent-foreground border border-accent-foreground">
                                    {vendor[0]} - &#8377;{vendor[1]}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            },
        },
    ];

    const historyColumns: ColumnDef<HistoryData>[] = [
        {
            header: 'Action',
            cell: ({ row }: { row: Row<HistoryData> }) => {
                const indent = row.original;

                return (
                    <div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedIndent(null);
                                setSelectedHistory(indent);
                                setOpenDialog(true);
                            }}
                        >
                            Update
                        </Button>
                    </div>
                );
            },
        },
        { accessorKey: 'date', header: 'Timestamp' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'firmNameMatch', header: ' Firm Name' },
        { accessorKey: 'indenter', header: 'Indenter' },
        { accessorKey: 'department', header: 'Category' },
        { accessorKey: 'product', header: 'Product' },
        { accessorKey: 'quantity', header: 'Quantity' },
        { accessorKey: 'uom', header: 'UOM' },
        { accessorKey: 'areaOfUse', header: 'Area of Use' },
        {
            accessorKey: 'vendor',
            header: 'Vendor',
            cell: ({ row }) => {
                const vendor = row.original.vendor;
                return (
                    <div className="grid place-items-center">
                        <div className="flex flex-col gap-1">
                            <span className="rounded-full text-xs px-3 py-1 bg-accent text-accent-foreground border border-accent-foreground">
                                {vendor[0]} - &#8377;{vendor[1]}
                                {row.original.rank && (
                                    <span className="ml-2 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                        {row.original.rank}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                );
            },
        },
    ];

    const schema = z.object({
        vendor: z.coerce.number(),
    });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            vendor: undefined,
        },
    });

    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            const selectedVendor = selectedIndent?.vendors[values.vendor];
            if (!selectedVendor) return;

            const rate = parseFloat(selectedVendor[1]) || 0;
            const tax = parseFloat(selectedVendor[5]) || 0;

            const updates = {
                approved_date: new Date().toISOString(),
                approved_vendor_name: selectedVendor[0] || '',
                approved_rate: rate,
                approved_payment_term: selectedVendor[2] || '',
            };

            await storeApi.upsertByParent('management_approval', selectedIndent?.id!, updates);
            await storeApi.upsertByParent('vendor_quotation', selectedIndent?.id!, { po_required: 'Yes' });

            toast.success(`Approved vendor for ${selectedIndent?.indentNo}`);
            setOpenDialog(false);
            form.reset();

            // Refresh both tables
            fetchPendingApprovals();
            fetchCompletedApprovals();
        } catch (error: any) {
            console.error('Error approving vendor:', error);
            toast.error(error?.message || 'Failed to update vendor');
        }
    }

    const historyUpdateSchema = z.object({
        rate: z.coerce.number(),
    })

    const historyUpdateForm = useForm<z.infer<typeof historyUpdateSchema>>({
        resolver: zodResolver(historyUpdateSchema) as any,
        defaultValues: {
            rate: 0,
        },
    })

    useEffect(() => {
        if (selectedHistory) {
            historyUpdateForm.reset({ rate: parseInt(selectedHistory.vendor[1]) || 0 })
        }
    }, [selectedHistory, historyUpdateForm])

    async function onSubmitHistoryUpdate(values: z.infer<typeof historyUpdateSchema>) {
        try {
            await storeApi.upsertByParent('management_approval', selectedHistory?.id!, { approved_rate: Number(values.rate || 0) });

            toast.success(`Updated rate of ${selectedHistory?.indentNo}`);
            setOpenDialog(false);
            historyUpdateForm.reset({ rate: 0 });

            // Refresh history table
            fetchCompletedApprovals();
        } catch (err: any) {
            console.error('Error updating rate:', err);
            toast.error(err?.message || 'Failed to update vendor');
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs defaultValue="pending">
                    <Heading
                        heading="Management Approval"
                        subtext="Approve rates the updated vendors"
                        tabs
                        pendingCount={tableData.length}
                        historyCount={historyData.length}
                    >
                        <Users size={50} className="text-primary" />
                    </Heading>
                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['product', 'department', 'indenter', 'firmNameMatch', 'areaOfUse']}
                            dataLoading={dataLoading}
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={['product', 'department', 'indenter', 'firmNameMatch', 'areaOfUse']}
                            dataLoading={dataLoading}
                        />
                    </TabsContent>
                </Tabs>

                {selectedIndent && (
                    <DialogContent className="w-[95vw] md:max-w-3xl">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="space-y-6"
                            >
                                <DialogHeader>
                                    <DialogTitle>Management Approval</DialogTitle>
                                    <DialogDescription>
                                        Finalize and approve the preferred vendor for Indent <span className="font-bold text-foreground">{selectedIndent.indentNo}</span>
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Indent Info Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-md border text-sm bg-muted/20">
                                    <div>
                                        <p className="font-semibold text-muted-foreground mb-1 text-xs uppercase">Indenter</p>
                                        <p>{selectedIndent.indenter}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-muted-foreground mb-1 text-xs uppercase">Department</p>
                                        <p>{selectedIndent.department}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="font-semibold text-muted-foreground mb-1 text-xs uppercase">Product</p>
                                        <p className="truncate" title={selectedIndent.product}>{selectedIndent.product}</p>
                                    </div>
                                </div>

                                {/* Minimal Vendor Table */}
                                <div className="rounded-md border overflow-hidden text-sm">
                                    <FormField
                                        control={form.control}
                                        name="vendor"
                                        render={({ field }) => (
                                            <FormItem className="space-y-0 m-0">
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        value={field.value?.toString()}
                                                        className="gap-0"
                                                    >
                                                        <table className="w-full text-left">
                                                            <thead className="bg-muted">
                                                                <tr>
                                                                    <th className="px-4 py-3 font-medium w-12 text-center">Select</th>
                                                                    <th className="px-4 py-3 font-medium">Vendor</th>
                                                                    <th className="px-4 py-3 font-medium text-center">Tech Rank</th>
                                                                    <th className="px-4 py-3 font-medium text-right">Effective Rate</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border">
                                                                {(() => {
                                                                    const processedVendors = selectedIndent.vendors.map((v, i) => {
                                                                        const rate = parseFloat(v[1]) || 0;
                                                                        const tax = parseFloat(v[5]) || 0;
                                                                        const total = v[3] === 'Basic Rate' ? rate * (1 + tax / 100) : rate;
                                                                        return { vendor: v, originalIndex: i, total };
                                                                    });

                                                                    const validTotals = processedVendors.map(v => v.total).filter(t => t > 0);
                                                                    const minTotal = validTotals.length > 0 ? Math.min(...validTotals) : -1;
                                                                    const maxTotal = validTotals.length > 0 ? Math.max(...validTotals) : -1;

                                                                    const sortedVendors = [...processedVendors].sort((a, b) => a.total - b.total);

                                                                    return sortedVendors.map(({ vendor, originalIndex, total }) => {
                                                                        const isSelected = field.value?.toString() === originalIndex.toString();
                                                                        const isMin = total === minTotal && minTotal !== -1;
                                                                        const isMax = total === maxTotal && maxTotal !== -1 && maxTotal !== minTotal;

                                                                        return (
                                                                            <tr key={originalIndex} className={`transition-colors ${isSelected ? 'bg-primary/30' :
                                                                                isMin ? 'bg-green-300/10' :
                                                                                    isMax ? 'bg-red-300/10' :
                                                                                        'hover:bg-muted/10'
                                                                                }`}>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <RadioGroupItem value={`${originalIndex}`} id={`vendor-${originalIndex}`} className={isSelected ? 'text-primary' : ''} />
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <label htmlFor={`vendor-${originalIndex}`} className="cursor-pointer block w-full">
                                                                                        <div className="font-semibold text-foreground">{vendor[0]}</div>
                                                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                                                            {vendor[6] ? `Quote: ${vendor[6]}` : ''} | {vendor[2]}
                                                                                            {vendor[11] && vendor[2].toLowerCase().includes('advance') ? ` (Advance: ${vendor[11]}%)` : ''}
                                                                                            {vendor[9] ? ` | Delivery: ${vendor[9]} days` : ''}
                                                                                            {vendor[10] ? ` | Make: ${vendor[10]}` : ''}
                                                                                            {vendor[12] ? ` | Transport: ${vendor[12]}` : ''}
                                                                                        </div>
                                                                                    </label>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                                                                        ${vendor[8] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                                                                                    `}>
                                                                                        {vendor[8] || 'Not Ranked'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right">
                                                                                    <div className={`font-bold ${isMin ? 'text-green-600' : isMax ? 'text-red-600' : 'text-primary'}`}>
                                                                                        &#8377;{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-muted-foreground">
                                                                                        {vendor[3]} {vendor[3] === 'Basic Rate' ? `(+${vendor[5]}% tax)` : ''}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    });
                                                                })()}
                                                            </tbody>
                                                        </table>
                                                    </RadioGroup>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" type="button">Cancel</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={form.formState.isSubmitting || form.watch('vendor') === undefined}>
                                        {form.formState.isSubmitting && <Loader size={16} color="white" className="mr-2" />}
                                        Save Approval
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}

                {selectedHistory && (
                    <DialogContent className="w-[95vw] md:max-w-xl">
                        <Form {...historyUpdateForm}>
                            <form onSubmit={historyUpdateForm.handleSubmit(onSubmitHistoryUpdate, onError)} className="space-y-7">
                                <DialogHeader className="space-y-1">
                                    <DialogTitle>Update Rate</DialogTitle>
                                    <DialogDescription>
                                        Update rate for{' '}
                                        <span className="font-medium">
                                            {selectedHistory.indentNo}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-3">
                                    <FormField
                                        control={historyUpdateForm.control}
                                        name="rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rate</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        disabled={historyUpdateForm.formState.isSubmitting}
                                    >
                                        {historyUpdateForm.formState.isSubmitting && (
                                            <Loader
                                                size={20}
                                                color="white"
                                                aria-label="Loading Spinner"
                                            />
                                        )}
                                        Update
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
};