export type ReportColumn<T extends string = string> = {
  key: T;
  header: string;
};

export type ReportSchoolBrand = {
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
};

export type CsvRow = Record<string, string | number | null | undefined>;
