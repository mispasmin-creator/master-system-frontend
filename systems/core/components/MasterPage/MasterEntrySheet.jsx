import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import {
  PURCHASE_CATEGORIES,
  ORDER_CATEGORIES,
  PRODUCTION_CATEGORIES,
  STORE_CATEGORIES,
  RMSALES_CATEGORIES,
  SERVICES_CATEGORIES,
  CHECKLIST_CATEGORIES,
  INVENTORY_CATEGORIES,
} from './categories';

// The Add / Edit Master Entry modal shared by every system in Settings > Systems.
// Split out of MasterPage/index.jsx (which was pushing 5000 lines) — this piece
// alone was ~2250 lines of per-system category Select options + per-category
// field blocks, and it's naturally deferred: nothing here is needed until the
// user actually opens "Add Master Entry", so MasterPage lazy-loads it via
// next/dynamic instead of bundling it into the page's first paint.
export default function MasterEntrySheet({
  isOpen,
  onOpenChange,
  modalMode,
  modalCategory,
  setModalCategory,
  masterFormData,
  setMasterFormData,
  activeItem,
  currentSystemLabel,
  purchaseFirms,
  onSubmit,
  submitLoading,
}) {
  const isMasterModalOpen = isOpen;
  const setIsMasterModalOpen = onOpenChange;
  const handleMasterSubmit = onSubmit;
  const masterSubmitLoading = submitLoading;

  return (
      <Sheet open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
        <SheetContent className="sm:max-w-[480px]">
          <form onSubmit={handleMasterSubmit} className="flex flex-col h-full min-h-0">
            <SheetHeader>
              <SheetTitle>
                {modalMode === "edit" ? "Edit Master Entry" : "Add Master Entry"} ({currentSystemLabel})
              </SheetTitle>
              <SheetDescription>
                {modalMode === "edit"
                  ? `Update details for this entry in the ${currentSystemLabel} master table.`
                  : `Add a new entry in the ${currentSystemLabel} master table.`}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-4 overflow-y-auto pr-1">
              {/* Type Select Dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="entryType">Category / Type</Label>
                <Select
                  value={
                    activeItem === "purchase" ||
                    activeItem === "order" ||
                    activeItem === "production" ||
                    activeItem === "store" ||
                    activeItem === "rm-sales" ||
                    activeItem === "services" ||
                    activeItem === "checklist" ||
                    activeItem === "inventory"
                      ? modalCategory
                      : masterFormData.type ||
                        (modalCategory === "transporter"
                          ? "Transporter Name"
                          : modalCategory === "raw_material"
                          ? (activeItem === "repair" ? "Machine Name" : "Raw Material")
                          : "Vendor Name")
                  }
                  onValueChange={(val) => {
                    if (activeItem === "purchase") {
                      const found = PURCHASE_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                          typeOfKycForm: found.id === "transporter" ? (prev.typeOfKycForm || "Transportation") : prev.typeOfKycForm,
                        }));
                      }
                    } else if (activeItem === "order") {
                      const found = ORDER_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "production") {
                      const found = PRODUCTION_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "store") {
                      const found = STORE_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "rm-sales") {
                      const found = RMSALES_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "services") {
                      const found = SERVICES_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "checklist") {
                      const found = CHECKLIST_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else if (activeItem === "inventory") {
                      const found = INVENTORY_CATEGORIES.find((c) => c.id === val);
                      if (found) {
                        setModalCategory(found.id);
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: found.typeValue,
                        }));
                      }
                    } else {
                      setMasterFormData((prev) => ({ ...prev, type: val }));
                      if (val === "Vendor Name" || val === "Department") {
                        setModalCategory("vendor");
                      } else if (val === "Transporter Name" || val === "Transporter" || val === "FMS Name" || val === "FMS Master") {
                        setModalCategory("transporter");
                        setMasterFormData((prev) => ({
                          ...prev,
                          type: val,
                          typeOfKycForm: prev.typeOfKycForm || "Transportation",
                        }));
                      } else {
                        setModalCategory("raw_material");
                      }
                    }
                  }}
                  disabled={modalMode === "edit"}
                >
                  <SelectTrigger id="entryType" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeItem === "purchase" && (
                      <>
                        {PURCHASE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "order" && (
                      <>
                        {ORDER_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "production" && (
                      <>
                        {PRODUCTION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "store" && (
                      <>
                        {STORE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "rm-sales" && (
                      <>
                        {RMSALES_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "services" && (
                      <>
                        {SERVICES_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "checklist" && (
                      <>
                        {CHECKLIST_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeItem === "repair" && (
                      <>
                        <SelectItem value="Vendor Name">Vendor</SelectItem>
                        <SelectItem value="Transporter Name">Logistics</SelectItem>
                        <SelectItem value="Machine Name">Machine / Equipment</SelectItem>
                      </>
                    )}
                    {activeItem === "payment" && (
                      <>
                        <SelectItem value="Transporter Name">FMS Master</SelectItem>
                        <SelectItem value="Raw Material">Funding Channel</SelectItem>
                      </>
                    )}
                    {activeItem === "inventory" && (
                      <>
                        {INVENTORY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {![
                      "purchase",
                      "order",
                      "production",
                      "store",
                      "rm-sales",
                      "services",
                      "checklist",
                      "repair",
                      "payment",
                      "inventory",
                    ].includes(activeItem) && (
                      <>
                        <SelectItem value="Vendor Name">Vendor / Party</SelectItem>
                        <SelectItem value="Transporter Name">Transporter / Logistics</SelectItem>
                        <SelectItem value="Raw Material">Product / Material</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* ================= ORDER SYSTEM MODAL INPUTS ================= */}
              {activeItem === "order" && (
                <>
                  {/* Category: Party */}
                  {modalCategory === "party" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="orderFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="orderFirmName" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="orderPartyName">Party Name</Label>
                        <Input
                          id="orderPartyName"
                          placeholder="Enter party / customer name"
                          value={masterFormData.partyName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, partyName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="orderAddress">Address</Label>
                        <Input
                          id="orderAddress"
                          placeholder="Enter address"
                          value={masterFormData.address}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, address: e.target.value }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="orderGstNumber">GST Number</Label>
                          <Input
                            id="orderGstNumber"
                            placeholder="e.g. 22AAECA7235N1ZM"
                            value={masterFormData.gstNumber}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, gstNumber: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="orderCustomerCategory">Customer Category</Label>
                          <Input
                            id="orderCustomerCategory"
                            placeholder="e.g. A, B, C"
                            value={masterFormData.customerCategory}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, customerCategory: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category: Transporter */}
                  {modalCategory === "transporter" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderTransporterName">Transporter Name</Label>
                      <Input
                        id="orderTransporterName"
                        placeholder="Enter transporter name"
                        value={masterFormData.transporterName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, transporterName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Material Return Transporter */}
                  {modalCategory === "material_return_transporter" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderMaterialReturnTransporterName">Material Return Transporter Name</Label>
                      <Input
                        id="orderMaterialReturnTransporterName"
                        placeholder="Enter material return transporter name"
                        value={masterFormData.materialReturnTransporterName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, materialReturnTransporterName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Product */}
                  {modalCategory === "product" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="orderProductName">Product Name</Label>
                        <Input
                          id="orderProductName"
                          placeholder="Enter product name"
                          value={masterFormData.productName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, productName: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="orderUom">UOM / Unit</Label>
                        <Input
                          id="orderUom"
                          placeholder="e.g. MT, PCS, KG"
                          value={masterFormData.uom}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Sales Person */}
                  {modalCategory === "sales_person" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderSalesPerson">Marketing / Sales Person Name</Label>
                      <Input
                        id="orderSalesPerson"
                        placeholder="Enter marketing / sales person name"
                        value={masterFormData.marketingSalesPerson}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, marketingSalesPerson: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: PI Type */}
                  {modalCategory === "pi_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderTypeOfPi">Type of PI</Label>
                      <Input
                        id="orderTypeOfPi"
                        placeholder="e.g. 100% Advance, Partly Advance Partly PI"
                        value={masterFormData.typeOfPi}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, typeOfPi: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Customer Category */}
                  {modalCategory === "customer_category" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderCustomerCategoryOnly">Customer Category</Label>
                      <Input
                        id="orderCustomerCategoryOnly"
                        placeholder="e.g. A, B, C, D"
                        value={masterFormData.customerCategory}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, customerCategory: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: UOM */}
                  {modalCategory === "uom" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="orderUomOnly">Unit of Measurement (UOM)</Label>
                      <Input
                        id="orderUomOnly"
                        placeholder="e.g. MT, PCS, KG, ROLL, KL"
                        value={masterFormData.uom}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* ================= PRODUCTION SYSTEM MODAL INPUTS ================= */}
              {activeItem === "production" && (
                <>
                  {/* Category: Raw Material */}
                  {modalCategory === "raw_material" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameRaw">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameRaw" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodRawMaterialName">Name of Raw Material</Label>
                        <Input
                          id="prodRawMaterialName"
                          placeholder="Enter raw material name"
                          value={masterFormData.nameOfRawMaterial}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, nameOfRawMaterial: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Finished Goods */}
                  {modalCategory === "finished_goods" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameFG">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameFG" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFinishedGoodsName">Finished Goods Name</Label>
                        <Input
                          id="prodFinishedGoodsName"
                          placeholder="Enter finished goods name"
                          value={masterFormData.finishedGoodsName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, finishedGoodsName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Crushing Product */}
                  {modalCategory === "crushing_product" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameCrush">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameCrush" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodCrushingProductName">Crushing Product Name</Label>
                        <Input
                          id="prodCrushingProductName"
                          placeholder="Enter crushing product name"
                          value={masterFormData.crushingProductName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, crushingProductName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: General Material */}
                  {modalCategory === "material" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prodFirmNameMat">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="prodFirmNameMat" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="prodMaterialName">Material Name</Label>
                        <Input
                          id="prodMaterialName"
                          placeholder="Enter material name"
                          value={masterFormData.materialName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, materialName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Supervisor */}
                  {modalCategory === "supervisor" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodSupervisorName">Supervisor Name</Label>
                      <Input
                        id="prodSupervisorName"
                        placeholder="Enter supervisor name"
                        value={masterFormData.supervisorName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, supervisorName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: SF Supervisor */}
                  {modalCategory === "sf_supervisor" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodSfSupervisorName">SF Supervisor Name</Label>
                      <Input
                        id="prodSfSupervisorName"
                        placeholder="Enter SF supervisor name"
                        value={masterFormData.sfSupervisorName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, sfSupervisorName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Tested By */}
                  {modalCategory === "tested_by" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodTestedBy">Tested By (QC Tester Name)</Label>
                      <Input
                        id="prodTestedBy"
                        placeholder="Enter tester name"
                        value={masterFormData.testedBy}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, testedBy: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Shift */}
                  {modalCategory === "shift" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodShift">Shift</Label>
                      <Input
                        id="prodShift"
                        placeholder="e.g. Morning, Evening, Night, Day"
                        value={masterFormData.shift}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, shift: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Priority */}
                  {modalCategory === "priority" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodPriority">Priority</Label>
                      <Input
                        id="prodPriority"
                        placeholder="e.g. Normal, High, Urgent"
                        value={masterFormData.priority}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, priority: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Flow of Material */}
                  {modalCategory === "flow_of_material" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodFlowOfMaterial">Flow of Material</Label>
                      <Input
                        id="prodFlowOfMaterial"
                        placeholder="e.g. Good, Not Good, OK OK"
                        value={masterFormData.flowOfMaterial}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, flowOfMaterial: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Status */}
                  {modalCategory === "status" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodStatus">Status</Label>
                      <Input
                        id="prodStatus"
                        placeholder="e.g. Ok, Not Ok"
                        value={masterFormData.status}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, status: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                    {/* Category: Test Status */}
                  {modalCategory === "test_status" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="prodTestStatus">Test Status</Label>
                      <Input
                        id="prodTestStatus"
                        placeholder="e.g. Pass, Fail"
                        value={masterFormData.testStatus}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, testStatus: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* ================= STORE SYSTEM MODAL INPUTS ================= */}
              {activeItem === "store" && (
                <>
                  {/* Category: Items & Products */}
                  {modalCategory === "item" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeItemFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="storeItemFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeItemName">Item Name</Label>
                        <Input
                          id="storeItemName"
                          placeholder="e.g. MS Pipe, Safety Helmet, Grease"
                          value={masterFormData.itemName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, itemName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="storeItemCategory">Category</Label>
                          <Input
                            id="storeItemCategory"
                            placeholder="e.g. Consumable, Raw Material"
                            value={masterFormData.category}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, category: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="storeItemGroup">Group Name</Label>
                          <Input
                            id="storeItemGroup"
                            placeholder="e.g. Mechanical, Electrical"
                            value={masterFormData.groupName}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, groupName: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeItemUom">Unit of Measurement (UOM)</Label>
                        <Input
                          id="storeItemUom"
                          placeholder="e.g. MT, PCS, NOS, MTR, KG"
                          value={masterFormData.uom}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Item Categories */}
                  {modalCategory === "category" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeCategory">Category</Label>
                      <Input
                        id="storeCategory"
                        placeholder="e.g. Consumable, Raw Material, Tools, Spare Parts"
                        value={masterFormData.category}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, category: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Item Groups */}
                  {modalCategory === "group_name" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeGroupName">Group Name</Label>
                      <Input
                        id="storeGroupName"
                        placeholder="e.g. Mechanical, Electrical, Civil, Safety"
                        value={masterFormData.groupName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, groupName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Units of Measurement (UOM) */}
                  {modalCategory === "uom" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeUom">Unit of Measurement (UOM)</Label>
                      <Input
                        id="storeUom"
                        placeholder="e.g. MT, PCS, NOS, KG, LTR, MTR"
                        value={masterFormData.uom}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Vendors & Suppliers */}
                  {modalCategory === "vendor" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorName">Vendor Name</Label>
                        <Input
                          id="storeVendorName"
                          placeholder="Enter vendor or supplier name"
                          value={masterFormData.vendorName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorGstin">Vendor GSTIN</Label>
                        <Input
                          id="storeVendorGstin"
                          placeholder="e.g. 24AAAAA0000A1Z5"
                          value={masterFormData.vendorGstin}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorGstin: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorEmail">Vendor Email</Label>
                        <Input
                          id="storeVendorEmail"
                          type="email"
                          placeholder="vendor@example.com"
                          value={masterFormData.vendorEmail}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorEmail: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeVendorAddress">Vendor Address</Label>
                        <Input
                          id="storeVendorAddress"
                          placeholder="Enter vendor address"
                          value={masterFormData.vendorAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, vendorAddress: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Companies */}
                  {modalCategory === "company" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeCompanyName">Company Name</Label>
                        <Input
                          id="storeCompanyName"
                          placeholder="Enter company name"
                          value={masterFormData.companyName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, companyName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="storeCompanyGstin">Company GSTIN</Label>
                          <Input
                            id="storeCompanyGstin"
                            placeholder="e.g. 24AAAAA0000A1Z5"
                            value={masterFormData.companyGstin}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, companyGstin: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="storeCompanyPan">Company PAN</Label>
                          <Input
                            id="storeCompanyPan"
                            placeholder="e.g. ABCDE1234F"
                            value={masterFormData.companyPan}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, companyPan: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeCompanyPhone">Company Phone</Label>
                        <Input
                          id="storeCompanyPhone"
                          placeholder="e.g. +91 9876543210"
                          value={masterFormData.companyPhone}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, companyPhone: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="storeCompanyAddress">Company Address</Label>
                        <Input
                          id="storeCompanyAddress"
                          placeholder="Enter company address"
                          value={masterFormData.companyAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, companyAddress: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Departments */}
                  {modalCategory === "department" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeDepartment">Department</Label>
                      <Input
                        id="storeDepartment"
                        placeholder="e.g. Production, Electrical, Maintenance, QC, HR"
                        value={masterFormData.department}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, department: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Areas of Use */}
                  {modalCategory === "area_of_use" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeAreaOfUse">Area of Use</Label>
                      <Input
                        id="storeAreaOfUse"
                        placeholder="e.g. Kiln 1, Boiler House, Workshop, Lab"
                        value={masterFormData.areaOfUse}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, areaOfUse: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Locations & Where */}
                  {modalCategory === "where" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeWhere">Where / Location</Label>
                      <Input
                        id="storeWhere"
                        placeholder="e.g. Main Store Rack A1, Yard 2, Shelf B3"
                        value={masterFormData.where}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, where: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: FMS Master */}
                  {modalCategory === "fms_name" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="storeFmsName">FMS Name</Label>
                      <Input
                        id="storeFmsName"
                        placeholder="e.g. Store FMS, Indent FMS, Procurement FMS"
                        value={masterFormData.fmsName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, fmsName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Payment Terms */}
                  {modalCategory === "payment_term" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storePaymentTerm">Payment Term</Label>
                        <Input
                          id="storePaymentTerm"
                          placeholder="e.g. 30 Days Credit, 100% Advance, Against Delivery"
                          value={masterFormData.paymentTerm}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, paymentTerm: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="storeDefaultTerms">Default Terms & Conditions</Label>
                        <Input
                          id="storeDefaultTerms"
                          placeholder="e.g. Standard 30 days after inspection"
                          value={masterFormData.defaultTerms}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, defaultTerms: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Addresses */}
                  {modalCategory === "address" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="storeBillingAddress">Billing Address</Label>
                        <Input
                          id="storeBillingAddress"
                          placeholder="Enter billing address"
                          value={masterFormData.billingAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, billingAddress: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="storeDestinationAddress">Destination Address</Label>
                        <Input
                          id="storeDestinationAddress"
                          placeholder="Enter destination delivery address"
                          value={masterFormData.destinationAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, destinationAddress: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= RM SALES SYSTEM MODAL INPUTS ================= */}
              {activeItem === "rm-sales" && (
                <>
                  {/* Category: Customers & Parties */}
                  {modalCategory === "party" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesPartyFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="rmSalesPartyFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesPartyName">Party Name</Label>
                        <Input
                          id="rmSalesPartyName"
                          placeholder="Enter buyer or customer party name"
                          value={masterFormData.partyName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, partyName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Products & Materials */}
                  {modalCategory === "product" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesProductFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="rmSalesProductFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="rmSalesProductName">Product Name</Label>
                        <Input
                          id="rmSalesProductName"
                          placeholder="Enter product or raw material name"
                          value={masterFormData.productName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, productName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Transport Types */}
                  {modalCategory === "transport" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rmSalesTransportType">Transport Type</Label>
                      <Input
                        id="rmSalesTransportType"
                        placeholder="e.g. FOR Destination, Ex Factory Depot, By Road"
                        value={masterFormData.transportType}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, transportType: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* ================= SERVICES SYSTEM MODAL INPUTS ================= */}
              {activeItem === "services" && (
                <>
                  {/* Category: Departments */}
                  {modalCategory === "department" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceDeptFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="serviceDeptFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="serviceDept">Department</Label>
                        <Input
                          id="serviceDept"
                          placeholder="e.g. IT, Logistics, Maintenance, Finance, HR"
                          value={masterFormData.department}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, department: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Group Heads */}
                  {modalCategory === "group_head" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceGroupHeadFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="serviceGroupHeadFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="serviceGroupHead">Group Head Name</Label>
                        <Input
                          id="serviceGroupHead"
                          placeholder="e.g. Operations Head, Management, Finance Head"
                          value={masterFormData.groupHead}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, groupHead: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: FMS Master */}
                  {modalCategory === "fms_name" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceFmsFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="serviceFmsFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="serviceFmsName">FMS Name</Label>
                        <Input
                          id="serviceFmsName"
                          placeholder="e.g. Repair FMS, Store FMS, Utility FMS"
                          value={masterFormData.fmsName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, fmsName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= CHECKLIST SYSTEM MODAL INPUTS ================= */}
              {activeItem === "checklist" && (
                <>
                  {/* Category: Doers / Assignees */}
                  {modalCategory === "doer" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="checklistDoerFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || masterFormData.firm || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val, firm: val }))
                          }
                        >
                          <SelectTrigger id="checklistDoerFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="checklistDoerName">Doer Name</Label>
                        <Input
                          id="checklistDoerName"
                          placeholder="Enter doer / assignee name"
                          value={masterFormData.doerName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, doerName: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="checklistRole">Role</Label>
                        <Input
                          id="checklistRole"
                          placeholder="e.g. User, Supervisor, Manager"
                          value={masterFormData.role}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, role: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Assigners (Given By) */}
                  {modalCategory === "given_by" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="checklistGivenByFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || masterFormData.firm || (purchaseFirms.length > 0 ? purchaseFirms[0] : "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val, firm: val }))
                          }
                        >
                          <SelectTrigger id="checklistGivenByFirmName" className="w-full">
                            <SelectValue placeholder="Select Firm Name" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="checklistGivenByName">Assigner Name (Task Given By)</Label>
                        <Input
                          id="checklistGivenByName"
                          placeholder="Enter task assigner name"
                          value={masterFormData.givenBy}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, givenBy: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= INVENTORY SYSTEM MODAL INPUTS ================= */}
              {activeItem === "inventory" && (
                <>
                  {/* Category: Raw Material */}
                  {modalCategory === "raw_material" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="invRawFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                          disabled={modalMode === "edit"}
                        >
                          <SelectTrigger id="invRawFirmName" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="invItemName">Item Name</Label>
                        <Input
                          id="invItemName"
                          placeholder="Enter raw material item name"
                          value={masterFormData.itemName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, itemName: e.target.value }))
                          }
                          required
                          disabled={modalMode === "edit"}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="invRawUom">Unit</Label>
                        <Input
                          id="invRawUom"
                          placeholder="e.g. MT, KG, PCS"
                          value={masterFormData.uom}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                          }
                        />
                      </div>
                      {modalMode === "add" && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Opening stock and consumption figures are set from the Stock Adjustment page, not here.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Category: Finished Goods */}
                  {modalCategory === "finished_goods" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="invFgFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="invFgFirmName" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="invFinishedGoodsName">Product Name</Label>
                        <Input
                          id="invFinishedGoodsName"
                          placeholder="Enter finished goods product name"
                          value={masterFormData.finishedGoodsName || masterFormData.productName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              finishedGoodsName: e.target.value,
                              productName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Trading Material */}
                  {modalCategory === "trading_material" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="invTmFirmName">Firm Name</Label>
                        <Select
                          value={masterFormData.firmName || (purchaseFirms[0] || "PMMPL")}
                          onValueChange={(val) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: val }))
                          }
                        >
                          <SelectTrigger id="invTmFirmName" className="w-full">
                            <SelectValue placeholder="Select firm" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchaseFirms.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="invTradingProductName">Product Name</Label>
                        <Input
                          id="invTradingProductName"
                          placeholder="Enter trading material product name"
                          value={masterFormData.productName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, productName: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= PURCHASE & OTHER SYSTEMS MODAL INPUTS ================= */}
              {!["order", "production", "store", "rm-sales", "services", "checklist", "inventory"].includes(activeItem) && (
                <>
                  {/* Category: Vendor */}
                  {modalCategory === "vendor" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="vendorName">
                          {activeItem === "checklist" ? "User / Doer Name" : activeItem === "production" ? "Supervisor Name" : activeItem === "services" ? "Department Name" : "Vendor / Party Name"}
                        </Label>
                        <Input
                          id="vendorName"
                          placeholder="Enter name"
                          value={masterFormData.vendorName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              vendorName: e.target.value,
                              department: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="vendorNameKyc">Vendor Name KYC</Label>
                              <Input
                                id="vendorNameKyc"
                                placeholder="Enter KYC name"
                                value={masterFormData.vendorNameKyc}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, vendorNameKyc: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="typeOfKycForm">Type Of KYC Form</Label>
                              <Input
                                id="typeOfKycForm"
                                placeholder="e.g. Vendor, Transporter"
                                value={masterFormData.typeOfKycForm}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, typeOfKycForm: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="firmName">Firm Name</Label>
                              <Input
                                id="firmName"
                                placeholder="e.g. PMMPL"
                                value={masterFormData.firmName}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="gstNumber">GST Number</Label>
                              <Input
                                id="gstNumber"
                                placeholder="GST number"
                                value={masterFormData.gstNumber}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, gstNumber: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="phoneNumber">Phone Number</Label>
                              <Input
                                id="phoneNumber"
                                placeholder="Phone number"
                                value={masterFormData.phoneNumber}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="email">Email Address</Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="Email address"
                                value={masterFormData.email}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, email: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="bankAccountNo">Current Bank A/C No</Label>
                              <Input
                                id="bankAccountNo"
                                placeholder="Account number"
                                value={masterFormData.bankAccountNo}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, bankAccountNo: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="ifscCode">IFSC Code</Label>
                              <Input
                                id="ifscCode"
                                placeholder="IFSC code"
                                value={masterFormData.ifscCode}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, ifscCode: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {activeItem !== "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="firmName">Firm Name</Label>
                          <Input
                            id="firmName"
                            placeholder="e.g. PMMPL"
                            value={masterFormData.firmName}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Category: Transporter */}
                  {modalCategory === "transporter" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="transporterName">
                          {activeItem === "services" ? "FMS Name" : activeItem === "checklist" ? "Assigner Name" : "Transporter Name"}
                        </Label>
                        <Input
                          id="transporterName"
                          placeholder="Enter name"
                          value={masterFormData.transporterName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              transporterName: e.target.value,
                              fmsName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="transporterName2">Transporter Name 2</Label>
                          <Input
                            id="transporterName2"
                            placeholder="Secondary transporter name"
                            value={masterFormData.transporterName2}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, transporterName2: e.target.value }))
                            }
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="rateType">Rate Type / Logistics Option</Label>
                        <Input
                          id="rateType"
                          placeholder="e.g. Per MT, Fixed"
                          value={masterFormData.rateType}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              rateType: e.target.value,
                              typeOfRate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="transporterTypeOfKyc">Type Of KYC Form</Label>
                          <Input
                            id="transporterTypeOfKyc"
                            placeholder="e.g. Transportation"
                            value={masterFormData.typeOfKycForm}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, typeOfKycForm: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Category: Raw Material / Product */}
                  {modalCategory === "raw_material" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="rawMaterialName">
                          {activeItem === "repair" ? "Machine / Equipment Name" : activeItem === "payment" ? "Funding Channel Name" : "Product / Raw Material Name"}
                        </Label>
                        <Input
                          id="rawMaterialName"
                          placeholder="Enter name"
                          value={masterFormData.rawMaterialName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({
                              ...prev,
                              rawMaterialName: e.target.value,
                              productName: e.target.value,
                              itemName: e.target.value,
                              machineName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      {activeItem === "purchase" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="productName">Product Name</Label>
                              <Input
                                id="productName"
                                placeholder="Product name"
                                value={masterFormData.productName}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, productName: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="uom">UOM / Unit</Label>
                              <Input
                                id="uom"
                                placeholder="e.g. MT, PCS, KG"
                                value={masterFormData.uom}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="typeOfIndent">Type Of Indent</Label>
                              <Input
                                id="typeOfIndent"
                                placeholder="e.g. Raw Purchase"
                                value={masterFormData.typeOfIndent}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, typeOfIndent: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="typeOfRate">Type Of Rate</Label>
                              <Input
                                id="typeOfRate"
                                placeholder="e.g. Per MT, Fixed"
                                value={masterFormData.typeOfRate}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({
                                    ...prev,
                                    typeOfRate: e.target.value,
                                    rateType: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="areaLifting">Area Lifting</Label>
                              <Input
                                id="areaLifting"
                                placeholder="e.g. Factory"
                                value={masterFormData.areaLifting}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, areaLifting: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="paymentTerm">Payment Term</Label>
                              <Input
                                id="paymentTerm"
                                placeholder="e.g. 100% Advance"
                                value={masterFormData.paymentTerm}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, paymentTerm: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="rmFirmName">Firm Name</Label>
                              <Input
                                id="rmFirmName"
                                placeholder="e.g. PMMPL"
                                value={masterFormData.firmName}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="generatedBy">Generated By</Label>
                              <Input
                                id="generatedBy"
                                placeholder="Generated by"
                                value={masterFormData.generatedBy}
                                onChange={(e) =>
                                  setMasterFormData((prev) => ({ ...prev, generatedBy: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          {modalMode === "add" && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="aluminaRange">Alumina Range</Label>
                                <Input
                                  id="aluminaRange"
                                  placeholder="e.g. 70-75"
                                  value={masterFormData.aluminaRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, aluminaRange: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="ironRange">Iron Range</Label>
                                <Input
                                  id="ironRange"
                                  placeholder="e.g. 1.2-1.8"
                                  value={masterFormData.ironRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, ironRange: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="apRange">AP Range</Label>
                                <Input
                                  id="apRange"
                                  placeholder="e.g. 18"
                                  value={masterFormData.apRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, apRange: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="bdRange">BD Range</Label>
                                <Input
                                  id="bdRange"
                                  placeholder="e.g. 2.8"
                                  value={masterFormData.bdRange}
                                  onChange={(e) =>
                                    setMasterFormData((prev) => ({ ...prev, bdRange: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {activeItem !== "purchase" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="uom">UOM / Unit</Label>
                          <Input
                            id="uom"
                            placeholder="e.g. MT, PCS, KG"
                            value={masterFormData.uom}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Category: Firm — purchase_firm has its own richer shape than a
                      plain purchase_master row, see handleMasterSubmit's dedicated
                      "purchase" + "firm" branch which posts these to /purchase/firms. */}
                  {modalCategory === "firm" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firmNameOnly">Firm Name</Label>
                        <Input
                          id="firmNameOnly"
                          placeholder="e.g. Passary Minerals Pvt Ltd."
                          value={masterFormData.firmName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, firmName: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="firmDataName">Short Name</Label>
                        <Input
                          id="firmDataName"
                          placeholder="e.g. PMMPL, Purab, Rkl"
                          value={masterFormData.dataName}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, dataName: e.target.value }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="firmPhone">Phone</Label>
                          <Input
                            id="firmPhone"
                            placeholder="Phone number"
                            value={masterFormData.phone}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, phone: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="firmEmail">Email</Label>
                          <Input
                            id="firmEmail"
                            type="email"
                            placeholder="Email address"
                            value={masterFormData.email}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, email: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="firmGstin">GSTIN</Label>
                          <Input
                            id="firmGstin"
                            placeholder="GST number"
                            value={masterFormData.gstin}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, gstin: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="firmPan">PAN</Label>
                          <Input
                            id="firmPan"
                            placeholder="PAN number"
                            value={masterFormData.pan}
                            onChange={(e) =>
                              setMasterFormData((prev) => ({ ...prev, pan: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="firmPoPrefix">PO Prefix</Label>
                        <Input
                          id="firmPoPrefix"
                          placeholder="e.g. PMPL/PO/26-27/"
                          value={masterFormData.poPrefix}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, poPrefix: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="firmAddress">Address</Label>
                        <Input
                          id="firmAddress"
                          placeholder="Registered address"
                          value={masterFormData.address}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, address: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="firmBillingAddress">Billing Address</Label>
                        <Input
                          id="firmBillingAddress"
                          placeholder="Billing address (defaults to Address if left blank)"
                          value={masterFormData.billingAddress}
                          onChange={(e) =>
                            setMasterFormData((prev) => ({ ...prev, billingAddress: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Category: Indent Type */}
                  {modalCategory === "indent_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="typeOfIndentOnly">Type Of Indent</Label>
                      <Input
                        id="typeOfIndentOnly"
                        placeholder="e.g. Raw Purchase, Trading Purchase, Finished Goods"
                        value={masterFormData.typeOfIndent}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, typeOfIndent: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Rate Type */}
                  {modalCategory === "rate_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rateTypeOnly">Rate Type</Label>
                      <Input
                        id="rateTypeOnly"
                        placeholder="e.g. Per MT, Fixed"
                        value={masterFormData.rateType}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({
                            ...prev,
                            rateType: e.target.value,
                            typeOfRate: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Area Lifting */}
                  {modalCategory === "area_lifting" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="areaLiftingOnly">Area Lifting / Location</Label>
                      <Input
                        id="areaLiftingOnly"
                        placeholder="e.g. Factory, Direct Supply To Party"
                        value={masterFormData.areaLifting}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, areaLifting: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Payment Term */}
                  {modalCategory === "payment_term" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="paymentTermOnly">Payment Term</Label>
                      <Input
                        id="paymentTermOnly"
                        placeholder="e.g. 100% Advance, Credit, Partly Advance/ Partly PI"
                        value={masterFormData.paymentTerm}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, paymentTerm: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: UOM */}
                  {modalCategory === "uom" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="uomOnly">Unit of Measurement (UOM)</Label>
                      <Input
                        id="uomOnly"
                        placeholder="e.g. MT, KG, PCS, Box, Liter, Meter, Bag"
                        value={masterFormData.uom}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, uom: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: KYC Form Type */}
                  {modalCategory === "kyc_form" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="kycFormOnly">Type Of KYC Form</Label>
                      <Input
                        id="kycFormOnly"
                        placeholder="e.g. Vendor, Transportation, Product"
                        value={masterFormData.typeOfKycForm}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, typeOfKycForm: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: FMS Name */}
                  {modalCategory === "fms_name" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="fmsNameOnly">FMS Name</Label>
                      <Input
                        id="fmsNameOnly"
                        placeholder="e.g. Pasmin"
                        value={masterFormData.fmsName}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, fmsName: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Generated By */}
                  {modalCategory === "generated_by" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="generatedByOnly">Generated By (Requester Name)</Label>
                      <Input
                        id="generatedByOnly"
                        placeholder="e.g. Saurabh, Ajay Kumar, Ankit"
                        value={masterFormData.generatedBy}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, generatedBy: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}

                  {/* Category: Entry Type */}
                  {modalCategory === "entry_type" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="entryTypeField">Entry Classification / Type</Label>
                      <Input
                        id="entryTypeField"
                        placeholder="e.g. Independent, Common"
                        value={masterFormData.type}
                        onChange={(e) =>
                          setMasterFormData((prev) => ({ ...prev, type: e.target.value }))
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}
            </SheetBody>

            <SheetFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMasterModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={masterSubmitLoading}>
                {masterSubmitLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {modalMode === "edit" ? "Save Changes" : "Add Entry"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

  );
}
