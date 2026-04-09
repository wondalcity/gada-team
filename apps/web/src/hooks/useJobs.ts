import { useQuery } from "@tanstack/react-query";
import {
  getJobs,
  getJobDetail,
  getCategories,
  type JobsFilter,
} from "@/lib/jobs-api";

export function useJobs(filter: JobsFilter) {
  return useQuery({
    queryKey: ["jobs", filter],
    queryFn: () => getJobs(filter),
  });
}

export function useJobDetail(publicId: string | undefined) {
  return useQuery({
    queryKey: ["job", publicId],
    queryFn: () => getJobDetail(publicId!),
    enabled: !!publicId,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: Infinity,
  });
}
