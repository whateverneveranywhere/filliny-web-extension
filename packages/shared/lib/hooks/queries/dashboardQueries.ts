import { getDashboardOverview } from "../../services/api/Dashboard/index.js";
import { useQuery } from "@tanstack/react-query";

export const useDashboardOverview = () =>
  useQuery({
    queryKey: ["overview"],
    queryFn: getDashboardOverview,
  });
