import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { UpdateUserSettingsRequest, UserSettingsResponse } from "@/types";
import { usersClient } from "../client";

type UseUpdateUserSettingsOptions = Omit<
  UseMutationOptions<UserSettingsResponse, Error, UpdateUserSettingsRequest>,
  "mutationFn"
>;

export const useUpdateUserSettings = (options?: UseUpdateUserSettingsOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload: UpdateUserSettingsRequest) => await usersClient.updateUserSettings(payload),

    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.meSettings });

      if (options?.onSuccess) {
        options.onSuccess(data, variables, context, mutation);
      }
    },
  });
};
