import { API_URL } from "@/lib/auth";

const EMPTY_MASTER_DATA = {
  firmNameOptions: [],
  partyNameOptions: [],
  customerCategoryOptions: [],
  typeOfPiOptions: [],
  marketingSalesPersonOptions: [],
  productNameOptions: [],
  uomOptions: [],
  transporterNameOptions: [],
  materialReturnTransporterNameOptions: [],
  partyDetailsMap: {},
};

/**
 * Fetch every dropdown option list the Order system's forms need, in one call.
 * Mirrors systems/purchase/utils/masterDataUtils.js's pattern against the
 * order master endpoint.
 */
export async function fetchMasterData() {
  try {
    const res = await fetch(`${API_URL}/order/master/all-options`);
    if (!res.ok) throw new Error("Failed to fetch master data");
    const json = await res.json();
    return { ...EMPTY_MASTER_DATA, ...(json.data || {}) };
  } catch (error) {
    console.error("Error fetching order master data:", error);
    return EMPTY_MASTER_DATA;
  }
}

/**
 * Same as fetchMasterData(), but each array is reformatted into
 * {value,label} pairs for <Select> components.
 */
export async function fetchMasterDataForSelects() {
  const data = await fetchMasterData();
  const toOptions = (arr) => (arr || []).map((v) => ({ value: v, label: v }));

  return {
    ...data,
    firmNameOptions: toOptions(data.firmNameOptions),
    partyNameOptions: toOptions(data.partyNameOptions),
    customerCategoryOptions: toOptions(data.customerCategoryOptions),
    typeOfPiOptions: toOptions(data.typeOfPiOptions),
    marketingSalesPersonOptions: toOptions(data.marketingSalesPersonOptions),
    productNameOptions: toOptions(data.productNameOptions),
    uomOptions: toOptions(data.uomOptions),
    transporterNameOptions: toOptions(data.transporterNameOptions),
    materialReturnTransporterNameOptions: toOptions(data.materialReturnTransporterNameOptions),
  };
}
