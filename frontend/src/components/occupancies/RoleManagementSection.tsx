import { useEffect, useState, type FormEvent } from "react";
import {
  Users,
  UserCog,
  ShieldCheck,
  Pencil,
  X,
  Clock3,
  Plus,
  KeyRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";
import type { OccupancyType } from "../../types/occupancy";
import {
  getAdminUsers,
  changeUserRole,
  createAdminAccount,
  type ManagedUser,
  type ChangeUserRoleRequest,
  type CreateAdminRequest,
} from "../../services/userService";
import { getBuildings } from "../../services/buildingService";
import { getFlats } from "../../services/flatService";
import { resetAccountPassword } from "../../services/residentService";

type BuildingOption = Awaited<ReturnType<typeof getBuildings>>[number];
type FlatOption = Awaited<ReturnType<typeof getFlats>>[number];

interface RoleFormData {
  role: UserRole;
  building_id: string;
  flat_id: string;
  occupancy_type: OccupancyType;
}

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  building_manager: "Building Manager",
  resident: "Resident",
};

const initialRoleForm: RoleFormData = {
  role: "resident",
  building_id: "",
  flat_id: "",
  occupancy_type: "tenant",
};

export default function RoleManagementSection() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [flats, setFlats] = useState<FlatOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] =
    useState<ManagedUser | null>(null);

  const [roleForm, setRoleForm] =
    useState<RoleFormData>(initialRoleForm);

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [createAdminData, setCreateAdminData] =
    useState<CreateAdminRequest>({
      full_name: "",
      email: "",
      password: "",
    });
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [createAdminError, setCreateAdminError] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [userData, buildingData, flatData] = await Promise.all([
        getAdminUsers(),
        getBuildings(),
        getFlats(),
      ]);

      const activeBuildings = buildingData.filter(
        (building) => building.status === "active"
      );

      const activeBuildingIds = new Set(
        activeBuildings.map((building) => building.id)
      );

      setUsers(userData);
      setBuildings(activeBuildings);

      // Only offer flats belonging to active buildings.
      setFlats(
        flatData.filter((flat) =>
          activeBuildingIds.has(flat.building_id)
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load user accounts"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openManagerPasswordReset(target: ManagedUser) {
    if (
      currentUser?.role !== "admin" ||
      target.role !== "building_manager" ||
      !target.is_active
    ) {
      return;
    }

    setResetTarget(target);
    setResetPassword("");
    setConfirmResetPassword("");
    setResetError("");
  }

  function closeManagerPasswordReset() {
    if (resettingPassword) return;

    setResetTarget(null);
    setResetPassword("");
    setConfirmResetPassword("");
    setResetError("");
  }

  async function handleManagerPasswordReset(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!resetTarget || currentUser?.role !== "admin") return;

    if (resetPassword.length < 4) {
      setResetError("Password must contain at least 4 characters.");
      return;
    }

    if (resetPassword !== confirmResetPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResettingPassword(true);
    setResetError("");

    try {
      await resetAccountPassword(resetTarget.id, resetPassword);

      setSuccessMessage(
        `Password reset successfully for ${resetTarget.full_name}.`
      );

      setResetTarget(null);
      setResetPassword("");
      setConfirmResetPassword("");
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : "Failed to reset Building Manager password."
      );
    } finally {
      setResettingPassword(false);
    }
  }
  function canManageTarget(target: ManagedUser): boolean {
    if (!currentUser) return false;

    // Nobody can change their own role or the Super Admin account.
    if (
      target.login_id === currentUser.user_id ||
      target.is_super_admin ||
      !target.is_active
    ) {
      return false;
    }

    // Super Admin can manage every other active account.
    if (currentUser.is_super_admin) return true;

    // Normal Admin can manage Residents and Building Managers only.
    return target.role !== "admin";
  }

  function openRoleForm(target: ManagedUser) {
    if (!canManageTarget(target)) return;

    setSelectedUser(target);
    setRoleForm({
      ...initialRoleForm,
      role: target.role,
    });
    setFormError("");
  }

  function closeRoleForm() {
    if (submitting) return;

    setSelectedUser(null);
    setRoleForm(initialRoleForm);
    setFormError("");
  }

  function handleRoleChange(role: UserRole) {
    setRoleForm((previous) => ({
      ...previous,
      role,
      building_id: "",
      flat_id: "",
      occupancy_type: "tenant",
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedUser) return;

    let requestData: ChangeUserRoleRequest;

    if (roleForm.role === "building_manager") {
      if (!roleForm.building_id) {
        setFormError("Please select a building.");
        return;
      }

      requestData = {
        role: "building_manager",
        building_id: roleForm.building_id,
      };
    } else if (roleForm.role === "resident") {
      if (!roleForm.flat_id) {
        setFormError("Please select a flat.");
        return;
      }

      requestData = {
        role: "resident",
        flat_id: roleForm.flat_id,
        occupancy_type: roleForm.occupancy_type,
      };
    } else {
      requestData = {
        role: "admin",
      };
    }

    setSubmitting(true);
    setFormError("");

    try {
      await changeUserRole(selectedUser.id, requestData);

      setSelectedUser(null);
      setRoleForm(initialRoleForm);

      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to change user role"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateAdminForm() {
    if (!currentUser?.is_super_admin) return;

    setCreateAdminData({
      full_name: "",
      email: "",
      password: "",
    });
    setConfirmAdminPassword("");
    setCreateAdminError("");
    setSuccessMessage("");
    setShowCreateAdminForm(true);
  }

  function closeCreateAdminForm() {
    if (creatingAdmin) return;

    setShowCreateAdminForm(false);
    setCreateAdminData({
      full_name: "",
      email: "",
      password: "",
    });
    setConfirmAdminPassword("");
    setCreateAdminError("");
  }

  async function handleCreateAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!currentUser?.is_super_admin) {
      setCreateAdminError("Only the Super Admin can create Administrator accounts.");
      return;
    }

    if (createAdminData.password.length < 4) {
      setCreateAdminError("Password must contain at least 4 characters.");
      return;
    }

    if (createAdminData.password !== confirmAdminPassword) {
      setCreateAdminError("Passwords do not match.");
      return;
    }

    setCreatingAdmin(true);
    setCreateAdminError("");

    try {
      const created = await createAdminAccount({
        full_name: createAdminData.full_name.trim(),
        email: createAdminData.email.trim().toLowerCase(),
        password: createAdminData.password,
      });

      setShowCreateAdminForm(false);
      setCreateAdminData({
        full_name: "",
        email: "",
        password: "",
      });
      setConfirmAdminPassword("");

      await loadData();

      setSuccessMessage(
        `Administrator account created successfully. Login ID: ${created.login_id}`
      );
    } catch (err) {
      setCreateAdminError(
        err instanceof Error
          ? err.message
          : "Failed to create Administrator account."
      );
    } finally {
      setCreatingAdmin(false);
    }
  }
  const buildingNames = Object.fromEntries(
    buildings.map((building) => [
      building.id,
      building.name,
    ])
  );

  return (
    <>
      <div className="table-card occupancy-table-card role-management-card">
        <div className="table-header">
          <div>
            <h2>User Accounts</h2>
            <p>
              Manage account roles and access permissions.
            </p>
          </div>

          {currentUser?.is_super_admin && (
            <button
              type="button"
              className="primary-button role-create-admin-button"
              onClick={openCreateAdminForm}
            >
              <Plus size={16} />
              Create Administrator
            </button>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        {successMessage && (
          <p className="role-success-message" role="status">{successMessage}</p>
        )}

        {loading ? (
          <div className="building-message">
            <Clock3 size={20} />
            Loading user accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="building-message occupancy-empty-state">
            <Users size={30} />
            <strong>No user accounts found</strong>
          </div>
        ) : (
          <div className="table-wrapper occupancy-table-wrapper">
            <table className="role-management-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>LOGIN ID</th>
                  <th>ROLE</th>
                  <th>ASSIGNED BUILDING</th>
                  <th>ACCOUNT STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {users.map((account) => {
                  const canEdit = canManageTarget(account);

                  return (
                    <tr key={account.id}>
                      <td>
                        <div className="occupancy-resident-cell">
                          <strong>{account.full_name}</strong>
                          <small>{account.email}</small>
                        </div>
                      </td>

                      <td>{account.login_id ?? "—"}</td>

                      <td>
                        <span
                          className={`role-badge role-${account.role}`}
                        >
                          {roleLabels[account.role]}
                        </span>

                        {account.is_super_admin && (
                          <span className="super-admin-label">
                            <ShieldCheck size={13} />
                            Super Admin
                          </span>
                        )}
                      </td>

                      <td>
                        {account.role === "building_manager"
                          ? account.assigned_building_name ?? "Not assigned"
                          : "-"}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            account.is_active
                              ? "completed"
                              : "pending"
                          }`}
                        >
                          {account.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {canEdit ? (
                          <button
                            type="button"
                            className="occupancy-edit-button"
                            onClick={() => openRoleForm(account)}
                          >
                            <Pencil size={14} />
                            Change Role
                          </button>
                        ) : account.is_super_admin ? (
                          <span className="role-restricted-label">
                            Protected account
                          </span>
                        ) : account.login_id === currentUser?.user_id ? (
                          <span className="role-restricted-label">
                            Your account
                          </span>
                        ) : account.role === "admin" &&
                          !currentUser?.is_super_admin ? (
                          <span className="role-restricted-label">
                            Super Admin only
                          </span>
                        ) : (
                          <span className="role-restricted-label">
                            Inactive account
                          </span>
                        )}

                        {currentUser?.role === "admin" &&
                          account.role === "building_manager" &&
                          account.is_active && (
                            <button
                              type="button"
                              className="occupancy-edit-button"
                              onClick={() =>
                                openManagerPasswordReset(account)
                              }
                            >
                              <KeyRound size={14} />
                              Reset Password
                            </button>
                          )}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateAdminForm && currentUser?.is_super_admin && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateAdminForm();
          }}
        >
          <div
            className="modal occupancy-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-admin-title"
          >
            <div className="modal-header occupancy-modal-header">
              <div className="occupancy-modal-heading">
                <span className="occupancy-modal-icon">
                  <ShieldCheck size={20} />
                </span>

                <div>
                  <h2 id="create-admin-title">
                    Create Administrator
                  </h2>
                  <p>Create a new Administrator account.</p>
                </div>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeCreateAdminForm}
                disabled={creatingAdmin}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="occupancy-form"
              onSubmit={handleCreateAdmin}
            >
              <div className="form-group">
                <label htmlFor="new-admin-name">Full Name</label>
                <input
                  id="new-admin-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={150}
                  autoComplete="name"
                  placeholder="Enter full name"
                  value={createAdminData.full_name}
                  disabled={creatingAdmin}
                  onChange={(e) =>
                    setCreateAdminData((previous) => ({
                      ...previous,
                      full_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-admin-email">
                  Registered Email
                </label>
                <input
                  id="new-admin-email"
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="email"
                  placeholder="admin@example.com"
                  value={createAdminData.email}
                  disabled={creatingAdmin}
                  onChange={(e) =>
                    setCreateAdminData((previous) => ({
                      ...previous,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-admin-password">Password</label>
                <input
                  id="new-admin-password"
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 4 characters"
                  value={createAdminData.password}
                  disabled={creatingAdmin}
                  onChange={(e) =>
                    setCreateAdminData((previous) => ({
                      ...previous,
                      password: e.target.value,
                    }))
                  }
                />
                <small>Minimum 4 characters.</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-admin-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-admin-password"
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmAdminPassword}
                  disabled={creatingAdmin}
                  onChange={(e) =>
                    setConfirmAdminPassword(e.target.value)
                  }
                />
              </div>

              <p className="role-form-note">
                The new account will receive Administrator access,
                a unique two-digit Login ID, and will not have
                Super Admin privileges.
              </p>

              {createAdminError && (
                <p className="form-error" role="alert">
                  {createAdminError}
                </p>
              )}

              <div className="modal-actions occupancy-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeCreateAdminForm}
                  disabled={creatingAdmin}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    creatingAdmin ||
                    createAdminData.full_name.trim().length < 2 ||
                    !createAdminData.email.trim() ||
                    createAdminData.password.length < 4 ||
                    createAdminData.password !== confirmAdminPassword
                  }
                >
                  {creatingAdmin
                    ? "Creating..."
                    : "Create Administrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {resetTarget && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeManagerPasswordReset();
            }
          }}
        >
          <div
            className="modal occupancy-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-reset-title"
          >
            <div className="modal-header occupancy-modal-header">
              <div className="occupancy-modal-heading">
                <span className="occupancy-modal-icon">
                  <KeyRound size={20} />
                </span>

                <div>
                  <h2 id="manager-reset-title">
                    Reset Manager Password
                  </h2>
                  <p>
                    {resetTarget.full_name} - {resetTarget.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeManagerPasswordReset}
                disabled={resettingPassword}
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="occupancy-form"
              onSubmit={handleManagerPasswordReset}
            >
              <div className="form-group">
                <label htmlFor="manager-new-password">
                  New Password
                </label>
                <input
                  id="manager-new-password"
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  autoComplete="new-password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  disabled={resettingPassword}
                />
              </div>

              <div className="form-group">
                <label htmlFor="manager-confirm-password">
                  Confirm New Password
                </label>
                <input
                  id="manager-confirm-password"
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmResetPassword}
                  onChange={(e) =>
                    setConfirmResetPassword(e.target.value)
                  }
                  disabled={resettingPassword}
                />
              </div>

              {resetError && (
                <p className="form-error">{resetError}</p>
              )}

              <div className="modal-actions occupancy-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeManagerPasswordReset}
                  disabled={resettingPassword}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    resettingPassword ||
                    resetPassword.length < 4 ||
                    resetPassword !== confirmResetPassword
                  }
                >
                  {resettingPassword
                    ? "Resetting..."
                    : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedUser && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRoleForm();
          }}
        >
          <div
            className="modal occupancy-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-edit-title"
          >
            <div className="modal-header occupancy-modal-header">
              <div className="occupancy-modal-heading">
                <span className="occupancy-modal-icon">
                  <UserCog size={20} />
                </span>

                <div>
                  <h2 id="role-edit-title">Change User Role</h2>
                  <p>
                    {selectedUser.full_name} · {selectedUser.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeRoleForm}
                disabled={submitting}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="occupancy-form"
              onSubmit={handleSubmit}
            >
              <div className="form-group">
                <label htmlFor="new-user-role">New Role</label>

                <select
                  id="new-user-role"
                  value={roleForm.role}
                  onChange={(e) =>
                    handleRoleChange(e.target.value as UserRole)
                  }
                >
                  <option value="resident">Resident</option>
                  <option value="building_manager">
                    Building Manager
                  </option>

                  {currentUser?.is_super_admin && (
                    <option value="admin">Administrator</option>
                  )}
                </select>
              </div>

              {roleForm.role === "building_manager" && (
                <div className="form-group">
                  <label htmlFor="role-building">
                    Assign Building
                  </label>

                  <select
                    id="role-building"
                    required
                    value={roleForm.building_id}
                    onChange={(e) =>
                      setRoleForm((previous) => ({
                        ...previous,
                        building_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select Building</option>

                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>

                  {buildings.length === 0 && (
                    <small>No active buildings available.</small>
                  )}
                </div>
              )}

              {roleForm.role === "resident" && (
                <>
                  <div className="form-group">
                    <label htmlFor="role-flat">
                      Assign Flat
                    </label>

                    <select
                      id="role-flat"
                      required
                      value={roleForm.flat_id}
                      onChange={(e) =>
                        setRoleForm((previous) => ({
                          ...previous,
                          flat_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Flat</option>

                      {flats.map((flat) => (
                        <option key={flat.id} value={flat.id}>
                          {buildingNames[flat.building_id] ?? "Building"}
                          {" - Flat "}
                          {flat.flat_number}
                          {" - Floor "}
                          {flat.floor_number}
                        </option>
                      ))}
                    </select>

                    {flats.length === 0 && (
                      <small>No flats in active buildings available.</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="role-occupancy-type">
                      Occupancy Type
                    </label>

                    <select
                      id="role-occupancy-type"
                      value={roleForm.occupancy_type}
                      onChange={(e) =>
                        setRoleForm((previous) => ({
                          ...previous,
                          occupancy_type: e.target.value as OccupancyType,
                        }))
                      }
                    >
                      <option value="tenant">Tenant</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </>
              )}

              {roleForm.role === "admin" && (
                <p className="role-form-note">
                  This account will receive Administrator access.
                </p>
              )}

              {formError && (
                <p className="form-error">{formError}</p>
              )}

              <div className="modal-actions occupancy-form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeRoleForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitting ||
                    roleForm.role === selectedUser.role ||
                    (roleForm.role === "building_manager" &&
                      buildings.length === 0) ||
                    (roleForm.role === "resident" &&
                      flats.length === 0)
                  }
                >
                  {submitting ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
