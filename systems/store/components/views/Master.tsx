import Heading from '../element/Heading';
import { useEffect, useMemo, useState } from 'react';
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy';
import { Database, Plus, RefreshCw } from 'lucide-react';
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

export interface MasterRecord {
    id: number;
    category?: string;
    groupName?: string;
    group_name?: string;
    itemName?: string;
    item_name?: string;
    department?: string;
    areaOfUse?: string;
    area_of_use?: string;
    uom?: string;
    firmName?: string;
    firm_name?: string;
    fmsName?: string;
    fms_name?: string;
    paymentTerm?: string;
    payment_term?: string;
    defaultTerms?: string;
    default_terms?: string;
    where?: string;
    vendorName?: string;
    vendor_name?: string;
    vendorGstin?: string;
    vendor_gstin?: string;
    vendorAddress?: string;
    vendor_address?: string;
    vendorEmail?: string;
    vendor_email?: string;
    companyName?: string;
    company_name?: string;
    companyAddress?: string;
    company_address?: string;
    companyGstin?: string;
    company_gstin?: string;
    companyPhone?: string;
    company_phone?: string;
    companyPan?: string;
    company_pan?: string;
    billingAddress?: string;
    billing_address?: string;
    destinationAddress?: string;
    destination_address?: string;
    createdAt?: string;
    updatedAt?: string;
}

const emptyFormState = {
    itemName: '',
    uom: '',
    department: '',
    groupName: '',
    category: '',
    areaOfUse: '',
    where: '',
    vendorName: '',
    firmName: '',
    fmsName: '',
    paymentTerm: '',
    defaultTerms: '',
    vendorGstin: '',
    vendorAddress: '',
    vendorEmail: '',
    companyName: '',
    companyAddress: '',
    companyGstin: '',
    companyPhone: '',
    companyPan: '',
    billingAddress: '',
    destinationAddress: '',
};

export default function Master() {
    const [tableData, setTableData] = useState<MasterRecord[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyFormState);

    const fetchData = async () => {
        try {
            setDataLoading(true);
            const res = await storeApi.get('master');
            const records = (res.data || []).map((r: any) => ({
                ...r,
                itemName: r.itemName || r.item_name || '',
                groupName: r.groupName || r.group_name || '',
                department: r.department || r.category || '',
                category: r.category || r.department || '',
                areaOfUse: r.areaOfUse || r.area_of_use || '',
                uom: r.uom || '',
                firmName: r.firmName || r.firm_name || '',
                fmsName: r.fmsName || r.fms_name || '',
                paymentTerm: r.paymentTerm || r.payment_term || '',
                defaultTerms: r.defaultTerms || r.default_terms || '',
                where: r.where || '',
                vendorName: r.vendorName || r.vendor_name || '',
                vendorGstin: r.vendorGstin || r.vendor_gstin || '',
                vendorAddress: r.vendorAddress || r.vendor_address || '',
                vendorEmail: r.vendorEmail || r.vendor_email || '',
                companyName: r.companyName || r.company_name || '',
                companyAddress: r.companyAddress || r.company_address || '',
                companyGstin: r.companyGstin || r.company_gstin || '',
                companyPhone: r.companyPhone || r.company_phone || '',
                companyPan: r.companyPan || r.company_pan || '',
                billingAddress: r.billingAddress || r.billing_address || '',
                destinationAddress: r.destinationAddress || r.destination_address || '',
            }));
            setTableData(records);
        } catch (error: any) {
            console.error('Error fetching master records:', error);
            toast.error(error?.message || 'Failed to fetch master records');
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
        if (!formData.itemName.trim()) {
            toast.error('Item Name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await storeApi.post('master', formData);
            toast.success('New Master item added successfully');
            setOpenDialog(false);
            setFormData(emptyFormState);
            fetchData();
        } catch (error: any) {
            console.error('Error creating master item:', error);
            toast.error(error?.message || 'Failed to add master item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns: ColumnDef<MasterRecord>[] = useMemo(
        () => [
            {
                id: 'srNo',
                header: 'SR No.',
                cell: ({ row }) => <div className="text-center font-medium">{row.index + 1}</div>,
            },
            {
                accessorKey: 'itemName',
                header: 'Item Name',
                cell: ({ row }) => <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.original.itemName || row.original.item_name || '-'}</div>,
            },
            {
                accessorKey: 'uom',
                header: 'UOM',
                cell: ({ row }) => <div className="text-center">{row.original.uom || '-'}</div>,
            },
            {
                accessorKey: 'department',
                header: 'Department',
                cell: ({ row }) => <div>{row.original.department || '-'}</div>,
            },
            {
                accessorKey: 'groupName',
                header: 'Group',
                cell: ({ row }) => <div>{row.original.groupName || row.original.group_name || '-'}</div>,
            },
            {
                accessorKey: 'category',
                header: 'Category',
                cell: ({ row }) => <div>{row.original.category || '-'}</div>,
            },
            {
                accessorKey: 'areaOfUse',
                header: 'Area of Use',
                cell: ({ row }) => <div>{row.original.areaOfUse || row.original.area_of_use || '-'}</div>,
            },
            {
                accessorKey: 'where',
                header: 'Location',
                cell: ({ row }) => <div>{row.original.where || '-'}</div>,
            },
            {
                accessorKey: 'vendorName',
                header: 'Vendor Name',
                cell: ({ row }) => <div>{row.original.vendorName || row.original.vendor_name || '-'}</div>,
            },
            {
                accessorKey: 'firmName',
                header: 'Firm Name',
                cell: ({ row }) => <div>{row.original.firmName || row.original.firm_name || '-'}</div>,
            },
            {
                accessorKey: 'fmsName',
                header: 'FMS Name',
                cell: ({ row }) => <div>{row.original.fmsName || row.original.fms_name || '-'}</div>,
            },
            {
                accessorKey: 'paymentTerm',
                header: 'Payment Term',
                cell: ({ row }) => <div>{row.original.paymentTerm || row.original.payment_term || '-'}</div>,
            },
            {
                accessorKey: 'defaultTerms',
                header: 'Default Terms',
                cell: ({ row }) => <div>{row.original.defaultTerms || row.original.default_terms || '-'}</div>,
            },
            {
                accessorKey: 'vendorGstin',
                header: 'Vendor GSTIN',
                cell: ({ row }) => <div>{row.original.vendorGstin || row.original.vendor_gstin || '-'}</div>,
            },
            {
                accessorKey: 'companyName',
                header: 'Company Name',
                cell: ({ row }) => <div>{row.original.companyName || row.original.company_name || '-'}</div>,
            },
        ],
        []
    );

    const searchFields = [
        'itemName',
        'item_name',
        'uom',
        'department',
        'groupName',
        'group_name',
        'category',
        'areaOfUse',
        'area_of_use',
        'where',
        'vendorName',
        'vendor_name',
        'firmName',
        'firm_name',
        'fmsName',
        'fms_name',
        'paymentTerm',
        'payment_term',
        'defaultTerms',
        'default_terms',
        'companyName',
        'company_name',
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
                Add New Item
            </Button>
        </div>
    );

    return (
        <div>
            <Heading heading="Store Master" subtext="Manage & view master items for Refrasynth Store">
                <Database size={50} className="text-primary" />
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
                            Add New Master Item
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-2">
                        {/* Section 1: Item Details */}
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                                Item Specifications
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                        Item Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        name="itemName"
                                        value={formData.itemName}
                                        onChange={handleChange}
                                        placeholder="e.g. Alumina Brick"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">UOM</label>
                                    <Input
                                        name="uom"
                                        value={formData.uom}
                                        onChange={handleChange}
                                        placeholder="e.g. Nos / MT / Kg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Department</label>
                                    <Input
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        placeholder="e.g. Production"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Group</label>
                                    <Input
                                        name="groupName"
                                        value={formData.groupName}
                                        onChange={handleChange}
                                        placeholder="e.g. Raw Material"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                                    <Input
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        placeholder="e.g. Refractory"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Area of Use</label>
                                    <Input
                                        name="areaOfUse"
                                        value={formData.areaOfUse}
                                        onChange={handleChange}
                                        placeholder="e.g. Kiln 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Location</label>
                                    <Input
                                        name="where"
                                        value={formData.where}
                                        onChange={handleChange}
                                        placeholder="e.g. Warehouse A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Name</label>
                                    <Input
                                        name="firmName"
                                        value={formData.firmName}
                                        onChange={handleChange}
                                        placeholder="e.g. REFRASYNTH"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">FMS Name</label>
                                    <Input
                                        name="fmsName"
                                        value={formData.fmsName}
                                        onChange={handleChange}
                                        placeholder="FMS Identifier"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Terms & Vendor Info */}
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                                Vendor & Terms Info
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor Name</label>
                                    <Input
                                        name="vendorName"
                                        value={formData.vendorName}
                                        onChange={handleChange}
                                        placeholder="Vendor Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor GSTIN</label>
                                    <Input
                                        name="vendorGstin"
                                        value={formData.vendorGstin}
                                        onChange={handleChange}
                                        placeholder="22AAAAA0000A1Z5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor Email</label>
                                    <Input
                                        name="vendorEmail"
                                        value={formData.vendorEmail}
                                        onChange={handleChange}
                                        placeholder="vendor@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payment Term</label>
                                    <Input
                                        name="paymentTerm"
                                        value={formData.paymentTerm}
                                        onChange={handleChange}
                                        placeholder="e.g. 30 Days"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Default Terms</label>
                                    <Input
                                        name="defaultTerms"
                                        value={formData.defaultTerms}
                                        onChange={handleChange}
                                        placeholder="Default Terms & Conditions"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Company & Address Info */}
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
                                Company & Address Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Company Name</label>
                                    <Input
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Company Phone</label>
                                    <Input
                                        name="companyPhone"
                                        value={formData.companyPhone}
                                        onChange={handleChange}
                                        placeholder="Phone number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Company PAN</label>
                                    <Input
                                        name="companyPan"
                                        value={formData.companyPan}
                                        onChange={handleChange}
                                        placeholder="ABCDE1234F"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Company GSTIN</label>
                                    <Input
                                        name="companyGstin"
                                        value={formData.companyGstin}
                                        onChange={handleChange}
                                        placeholder="Company GSTIN"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Billing Address</label>
                                    <Input
                                        name="billingAddress"
                                        value={formData.billingAddress}
                                        onChange={handleChange}
                                        placeholder="Billing Address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Destination Address</label>
                                    <Input
                                        name="destinationAddress"
                                        value={formData.destinationAddress}
                                        onChange={handleChange}
                                        placeholder="Destination Address"
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
                                {isSubmitting ? 'Saving...' : 'Save Master Item'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
