import { Outlet } from "react-router";
import AdminNavBar from "../admin/AdminNavBar";

const AdminLayout: React.FC = () => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col transition-width duration-200 ease-in-out">
      <AdminNavBar />
      <div className="min-h-0 flex-1 overflow-y-auto px-[16px] pb-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
