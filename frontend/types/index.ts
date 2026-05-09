export type Option = {
  label: string;
  value: string;
};

export type AdvancedOption = Pick<Option, "label"> & {
  options: Option[];
};

export enum STATE_STATUS {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}
