import type { LegacyColumnDef as ColumnDef, LegacyRow as Row } from '@tanstack/react-table/legacy';
import { useEffect, useState } from 'react';
import DataTable from '../element/DataTable';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    fetchStoreInRecords,
    updateStoreInHodApproval,
    createPaymentEntry,
    createTransportPaymentEntry,
    type StoreInRecord,
} from '@/services/storeInService';
import { createAuditRecord } from '@/services/tallyEntryService';
import { useSheets } from '@/context/SheetsContext';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { PuffLoader as Loader } from 'react-spinners';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { UserCheck, X, Package2, FileCheck, CheckCircle2, XCircle, AlertCircle, Truck, CheckSquare } from 'lucide-react';
import { Tabs, TabsContent } from '../ui/tabs';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { formatDateTime, parseCustomDate } from '@/lib/utils';
import { Pill } from '../ui/pill';

interface HodPendingData {
    id?: number;
    liftNumber: string;
    indentNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    receivingStatus: string;
    receivedQuantity: number;
    damageOrder: string;
    quantityAsPerBill: string;
    priceAsPerPoCheck: string;
    remark: string;
    plannedHod: string;
    timestamp: string;
    firmNameMatch: string;
    poNumber: string;
    billAmount: number;
    photoOfBill: string;
    typeOfBill: string;
    transportationInclude: string;
    transporterName?: string;
    vehicleNo?: string;
    driverName?: string;
    driverMobileNo?: string;
    amount?: number;
    billNo?: string;
    paymentTerms: string;
    indentQty: number;
}

interface HodHistoryData {
    liftNumber: string;
    indentNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    hodStatus: string;
    hodDate: string;
    firmNameMatch: string;
    transportationInclude: string;
    transporterName: string;
    vehicleNo: string;
    driverName: string;
    driverMobileNo: string;
    amount: number;
}

const schema = z
    .object({
        transportationInclude: z.string().min(1, 'Required'),
        transporterName: z.string().optional(),
        vehicleNo: z.string().optional(),
        driverName: z.string().optional(),
        driverMobileNo: z.string().optional(),
        amount: z.coerce.number().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.transportationInclude === 'Yes') {
            if (!data.transporterName || data.transporterName.trim() === '') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['transporterName'],
                    message: 'Transporter name is required when transportation is included',
                });
            }
            if (!data.vehicleNo || data.vehicleNo.trim() === '') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['vehicleNo'],
                    message: 'Vehicle number is required when transportation is included',
                });
            }
            if (!data.driverName || data.driverName.trim() === '') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['driverName'],
                    message: 'Driver name is required when transportation is included',
                });
            }
            if (!data.driverMobileNo || data.driverMobileNo.trim() === '') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['driverMobileNo'],
                    message: 'Driver mobile number is required when transportation is included',
                });
            }
            if (data.amount === undefined || data.amount === null || isNaN(data.amount) || Number(data.amount) <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['amount'],
                    message: 'Amount must be greater than 0 when transportation is included',
                });
            }
        }
    });

type FormValues = z.infer<typeof schema>;

export default () => {
    const { user } = useAuth();
    const { updateAll } = useSheets();
    const [storeInRecords, setStoreInRecords] = useState<StoreInRecord[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [pendingData, setPendingData] = useState<HodPendingData[]>([]);
    const [historyData, setHistoryData] = useState<HodHistoryData[]>([]);
    const [selectedItem, setSelectedItem] = useState<HodPendingData | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            transportationInclude: '',
            transporterName: '',
            vehicleNo: '',
            driverName: '',
            driverMobileNo: '',
            amount: 0,
        },
    });

    const transportationInclude = form.watch('transportationInclude');

    // Reset form when selected item changes
    useEffect(() => {
        if (selectedItem) {
            form.reset({
                transportationInclude: selectedItem.transportationInclude || '',
                transporterName: selectedItem.transporterName || '',
                vehicleNo: selectedItem.vehicleNo || '',
                driverName: selectedItem.driverName || '',
                driverMobileNo: selectedItem.driverMobileNo || '',
                amount: selectedItem.amount || 0,
            });
        }
    }, [selectedItem, form]);

    // Reset transportation details when "No" is selected
    useEffect(() => {
        if (transportationInclude === 'No') {
            form.setValue('transporterName', '');
            form.setValue('vehicleNo', '');
            form.setValue('driverName', '');
            form.setValue('driverMobileNo', '');
            form.setValue('amount', 0);
        }
    }, [transportationInclude, form]);

    const fetchAllData = async () => {
        setDataLoading(true);
        try {
            const records = await fetchStoreInRecords();
            setStoreInRecords(records);
        } catch (error) {
            console.error('Failed to fetch store-in records:', error);
            toast.error('Failed to load data');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        const filteredByFirm = storeInRecords.filter((item) =>
            !user?.firmNameMatch || user.firmNameMatch.toLowerCase() === "all" || item.firmNameMatch === user.firmNameMatch
        );

        setPendingData(
            filteredByFirm
                .filter((i) => (i.hasCheck || (i.plannedHod && i.plannedHod !== '')) && !i.hasHodApproval && i.receivingStatus !== 'Not Received')
                .map((i) => ({
                    id: i.id,
                    liftNumber: i.liftNumber || '',
                    indentNo: i.indentNo || '',
                    vendorName: i.vendorName || '',
                    productName: i.productName || '',
                    qty: Number(i.qty) || 0,
                    receivingStatus: i.receivingStatus || '',
                    receivedQuantity: Number(i.receivedQuantity) || 0,
                    damageOrder: i.damageOrder || '',
                    quantityAsPerBill: i.quantityAsPerBill || '',
                    priceAsPerPoCheck: i.priceAsPerPoCheck || '',
                    remark: i.remark || '',
                    plannedHod: i.plannedHod || i.timestamp || '',
                    timestamp: i.timestamp || '',
                    firmNameMatch: i.firmNameMatch || '',
                    poNumber: i.poNumber || '',
                    billAmount: Number(i.billAmount) || 0,
                    photoOfBill: i.photoOfBill || '',
                    typeOfBill: i.typeOfBill || '',
                    transportationInclude: i.transportationInclude || '',
                    transporterName: i.transporterName || '',
                    vehicleNo: i.vehicleNo || '',
                    driverName: i.driverName || '',
                    driverMobileNo: i.driverMobileNo || '',
                    amount: Number(i.amount) || 0,
                    billNo: i.billNo || '',
                    paymentTerms: i.paymentTerms || '',
                    indentQty: Number(i.indentQty) || 0,
                }))
        );

        setHistoryData(
            filteredByFirm
                .filter((i) => i.hasHodApproval || (i.actualHod && i.actualHod !== ''))
                .map((i) => ({
                    liftNumber: i.liftNumber || '',
                    indentNo: i.indentNo || '',
                    vendorName: i.vendorName || '',
                    productName: i.productName || '',
                    qty: Number(i.qty) || 0,
                    hodStatus: i.hodStatus || '',
                    hodDate: i.actualHod ? formatDateTime(parseCustomDate(i.actualHod)) : (i.timestamp ? formatDateTime(parseCustomDate(i.timestamp)) : ''),
                    firmNameMatch: i.firmNameMatch || '',
                    transportationInclude: i.transportationInclude || '',
                    transporterName: i.transporterName || '',
                    vehicleNo: i.vehicleNo || '',
                    driverName: i.driverName || '',
                    driverMobileNo: i.driverMobileNo || '',
                    amount: Number(i.amount) || 0,
                }))
        );
    }, [storeInRecords, user?.firmNameMatch]);

    async function onSubmit(values: FormValues) {
        if (!selectedItem || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const currentDateTime = new Date().toISOString();
            const liftId = selectedItem.id;
            const targetId = liftId || selectedItem.liftNumber;
            await updateStoreInHodApproval(targetId, {
                hodStatus: 'Approved',
                hodRemark: '',
                transportationInclude: values.transportationInclude,
                transporterName: values.transporterName || '',
                vehicleNo: values.vehicleNo || '',
                driverName: values.driverName || '',
                driverMobileNo: values.driverMobileNo || '',
                amount: Number(values.amount) || 0,
            });

            // ✅ Create Payment Entry ONLY if transportation is not included
            const terms = (selectedItem.paymentTerms || '').toString().toLowerCase();
            const isAdvanceTerm = terms.includes('partly pi') ||
                                 terms.includes('partly advance') ||
                                 terms.includes('100% advance') ||
                                 terms.includes('advance');

            if (isAdvanceTerm && values.transportationInclude !== 'Yes' && selectedItem.typeOfBill !== 'common' && liftId) {
                console.log('✅ Advance payment detected. Creating payment entry...');
                await createPaymentEntry({
                    liftId,
                    indent_number: selectedItem.indentNo,
                    vendor_name: selectedItem.vendorName || '',
                    po_number: selectedItem.poNumber || '',
                    bill_amount: selectedItem.billAmount || 0,
                    photo_of_bill: selectedItem.photoOfBill || '',
                    product_name: selectedItem.productName,
                    firm_name_match: selectedItem.firmNameMatch,
                    payment_terms: selectedItem.paymentTerms,
                });
            }

            // ✅ Always create/refresh the Audit Data entry (first stage of the Audit Data wizard)
            if (liftId) {
                try {
                    console.log('📝 Creating Audit Data entry from HOD Approval...');
                    const formattedDateOnly = currentDateTime.split('T')[0];
                    await createAuditRecord(liftId, {
                        timestamp: currentDateTime,
                        liftNumber: selectedItem.liftNumber || '',
                        indentNumber: selectedItem.indentNo || '',
                        poNumber: selectedItem.poNumber || '',
                        materialInDate: formattedDateOnly,
                        productName: selectedItem.productName || '',
                        billNo: selectedItem.billNo || '',
                        qty: Number(selectedItem.receivedQuantity || selectedItem.qty || 0),
                        partyName: selectedItem.vendorName || '',
                        billAmt: Number(selectedItem.billAmount || 0),
                        billImage: selectedItem.photoOfBill || '',
                        indentQty: Number(selectedItem.indentQty || 0),
                        hodStatus: 'Approved',
                        firmNameMatch: selectedItem.firmNameMatch || user?.firmNameMatch || '',
                    });
                } catch (auditError) {
                    console.error('Failed to create audit entry during HOD Approval:', auditError);
                }
            }

            // ✅ If transportation included, go straight to Make Payment (Freight Payment page removed)
            if (values.transportationInclude === 'Yes' && liftId) {
                try {
                    await createTransportPaymentEntry({
                        liftId,
                        indentNumber: selectedItem.indentNo,
                        transporterName: values.transporterName || '',
                        poNumber: selectedItem.poNumber || '',
                        freightAmount: Number(values.amount) || 0,
                        productName: selectedItem.productName || '',
                        firmNameMatch: selectedItem.firmNameMatch || '',
                        vehicleNo: values.vehicleNo || '',
                    });
                } catch (payError) {
                    console.error('Failed to create transport payment entry:', payError);
                }
            }

            toast.success(`Transportation updated for ${selectedItem.liftNumber}`);
            setOpenDialog(false);
            fetchAllData();
            updateAll();
        } catch (error) {
            console.error('Error in onSubmit:', error);
            toast.error('Failed to update transportation details');
        } finally {
            setIsSubmitting(false);
        }
    }

    const pendingColumns: any[] = [
        {
            header: 'Action',
            cell: ({ row }: any) => (
                <Button
                    variant="outline"
                    onClick={() => {
                        setSelectedItem(row.original);
                        setOpenDialog(true);
                    }}
                >
                    Check
                </Button>
            ),
        },
        { accessorKey: 'liftNumber', header: 'Lift No.' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'productName', header: 'Product' },
        { accessorKey: 'vendorName', header: 'Vendor' },
        { accessorKey: 'qty', header: 'Order Qty' },
        { accessorKey: 'receivedQuantity', header: 'Rec. Qty' },
        {
            accessorKey: 'damageOrder',
            header: 'Physical Good?',
            cell: ({ getValue }: any) => {
                const val = getValue() as string;
                return (
                    <Pill variant={val === 'Yes' ? 'default' : 'reject'}>
                        {val || 'N/A'}
                    </Pill>
                );
            }
        },
    ];

    const historyColumns: any[] = [
        { accessorKey: 'liftNumber', header: 'Lift No.' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'firmNameMatch', header: 'Firm Name' },
        { accessorKey: 'productName', header: 'Product' },
        {
            accessorKey: 'hodStatus', header: 'HOD Status',
            cell: ({ getValue }: any) => {
                const val = (getValue() || '') as string;
                return (
                    <Pill variant={val === 'Approved' ? 'default' : 'reject'}>
                        {val}
                    </Pill>
                );
            }
        },
        { accessorKey: 'transportationInclude', header: 'Trans. Include' },
        { accessorKey: 'transporterName', header: 'Transporter' },
        { accessorKey: 'vehicleNo', header: 'Vehicle No.' },
        { accessorKey: 'driverName', header: 'Driver Name' },
        { accessorKey: 'driverMobileNo', header: 'Driver Mobile' },
        { accessorKey: 'amount', header: 'Freight Amount' },
        { accessorKey: 'hodDate', header: 'Date' },
    ];

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={(open) => {
                setOpenDialog(open);
                if (!open) setSelectedItem(null);
            }}>
                <Tabs defaultValue="pending">
                    <Heading
                        heading="Transporting Update"
                        subtext="Validate store receiving results"
                        tabs
                        pendingCount={pendingData.length}
                        historyCount={historyData.length}
                    >
                        <UserCheck size={50} className="text-primary" />
                    </Heading>

                    <TabsContent value="pending">
                        <DataTable data={pendingData} columns={pendingColumns} searchFields={['liftNumber', 'indentNo', 'productName']} dataLoading={dataLoading} />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable data={historyData} columns={historyColumns} searchFields={['liftNumber', 'indentNo', 'productName', 'firmNameMatch']} dataLoading={dataLoading} />
                    </TabsContent>
                </Tabs>

                {selectedItem && (
                    <DialogContent className="sm:max-w-2xl">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <DialogHeader className="border-b pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <UserCheck className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-xl font-black">Transporting Update</DialogTitle>
                                            <DialogDescription className="text-xs font-medium">Verify store receiving results for Lift #{selectedItem.liftNumber}</DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="space-y-6 py-4">
                                    {/* Record Information Section */}
                                    <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4 border-b border-slate-200/50 pb-2">
                                            <Package2 className="w-4 h-4 text-slate-400" />
                                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Record Information</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Product Name</p>
                                                <p className="text-xs font-bold text-slate-900 line-clamp-1" title={selectedItem.productName}>{selectedItem.productName}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Vendor Name</p>
                                                <p className="text-xs font-bold text-slate-900 line-clamp-1" title={selectedItem.vendorName}>{selectedItem.vendorName}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">PO Number</p>
                                                <p className="text-xs font-black text-primary">{selectedItem.poNumber}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Bill Amount</p>
                                                <p className="text-sm font-black text-emerald-600">₹{selectedItem.billAmount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Transportation Details Section */}
                                    <div className="bg-white rounded-xl border p-4 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-primary" />
                                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Transportation Details</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="transportationInclude"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 pl-1">Transportation Include</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-10 border-slate-200">
                                                                    <SelectValue placeholder="Select" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Yes">Yes</SelectItem>
                                                                <SelectItem value="No">No</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />
                                            {transportationInclude === 'Yes' && (
                                                <>
                                                    <FormField
                                                        control={form.control}
                                                        name="transporterName"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-400 pl-1">Transporter Name</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Enter transporter name" {...field} value={field.value ?? ''} className="h-10 border-slate-200" />
                                                                </FormControl>
                                                                <FormMessage className="text-[10px]" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="vehicleNo"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-400 pl-1">Vehicle No.</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Enter Vehicle No." {...field} value={field.value ?? ''} className="h-10 border-slate-200" />
                                                                </FormControl>
                                                                <FormMessage className="text-[10px]" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="driverName"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-400 pl-1">Driver Name</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Enter Driver name" {...field} value={field.value ?? ''} className="h-10 border-slate-200" />
                                                                </FormControl>
                                                                <FormMessage className="text-[10px]" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="driverMobileNo"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-400 pl-1">Driver Mobile No.</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Enter Driver Mobile No." {...field} value={field.value ?? ''} className="h-10 border-slate-200" />
                                                                </FormControl>
                                                                <FormMessage className="text-[10px]" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="amount"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-[10px] font-bold uppercase text-slate-400 pl-1">Amount</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        {...field}
                                                                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                                        value={field.value ?? ''}
                                                                        className="h-10 border-slate-200"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage className="text-[10px]" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="border-t pt-4">
                                    <DialogClose asChild>
                                        <Button variant="ghost" className="h-10 text-slate-500 font-semibold" disabled={isSubmitting}>Cancel</Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="h-10 px-8 font-black font-semibold transition-all shadow-md bg-primary hover:bg-primary/90"
                                    >
                                        {isSubmitting ? <Loader size={16} color="white" className="mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />}
                                        Save Update
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