import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview } from "../../services/api/Dashboard/index.js";

export const useDashboardOverview = () =>
  useQuery({
    queryKey: ["overview"],
    queryFn: getDashboardOverview,
  });
