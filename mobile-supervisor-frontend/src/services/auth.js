import { publicClient } from "./apiClient";

const authService = {
  login: async (email, password) => {
    try {
      const response = await publicClient.post("/auth/login", {
        email,
        password,
      });
      const { accessToken, user } = response.data || {};

      if (accessToken) {
        sessionStorage.setItem("userToken", accessToken);
      }
      if (user) {
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      return response.data;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to sign in";
      throw new Error(message);
    }
  },

  logout: () => {
    sessionStorage.removeItem("userToken");
    sessionStorage.removeItem("user");
  },
};

export default authService;
