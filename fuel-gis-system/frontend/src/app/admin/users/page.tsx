import UserCreateForm from "@/components/admin/UserCreateForm";
import UserAssignStations from "@/components/admin/UserAssignStations";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="admin-page-title">Пользователи</h1>

      <div className="admin-grid admin-grid-2">
        <UserCreateForm />
        <UserAssignStations />
      </div>
    </div>
  );
}