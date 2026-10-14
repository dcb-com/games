import { createFileRoute } from "@tanstack/react-router";

import { Layout } from "~/dashboard/components/layout";
import { PayrollRunPage } from "~/dashboard/pages/payroll-run";

// A payroll admin's dashboard, on a payroll run.
export const Route = createFileRoute("/payroll")({
  component: () => (
    <Layout
      title="Run #1001"
      back={{ to: { to: "/payroll/run" }, label: "Run payroll" }}
    >
      <PayrollRunPage />
    </Layout>
  ),
});
