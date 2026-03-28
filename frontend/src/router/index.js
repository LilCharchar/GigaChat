import { createRouter, createWebHistory } from "vue-router";
import DashboardView from "../components/DashboardView.vue";
import LoginView from "../views/LoginView.vue";
import { useAuthStore } from "../stores/auth";

const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/login",
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: "/dashboard",
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/dashboard",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.ensureSession();

  if (to.meta.requiresAuth && !authStore.user) {
    return "/login";
  }

  if (to.meta.guestOnly && authStore.user) {
    return "/dashboard";
  }

  return true;
});

export default router;
