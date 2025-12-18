import React, { useEffect, useState } from "react";
import API from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { FaEye } from "react-icons/fa";
export default function InvitesPage() {
  const [invites, setInvites] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    status: "",
    client: "",
    search: "",
  });

  useEffect(() => {
    loadInvites();
  }, [page, limit, filters]);

  async function loadInvites() {
    try {
      const res = await API.get("/invites/all", {
        params: {
          ...filters,
          page,
          limit,
        },
      });

      setInvites(res.data.invites);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    }
  }

  function resetFilters() {
    setFilters({
      from: "",
      to: "",
      status: "",
      client: "",
      search: "",
    });
    setPage(1);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-4">All Invites</h1>

      {/* FILTER PANEL */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-5 flex flex-wrap gap-3">
        <input
          type="date"
          className="border p-2 rounded dark:bg-gray-700 dark:text-white"
          value={filters.from}
          onChange={(e) => {
            setFilters({ ...filters, from: e.target.value });
            setPage(1);
          }}
        />

        <input
          type="date"
          className="border p-2 rounded dark:bg-gray-700 dark:text-white"
          value={filters.to}
          onChange={(e) => {
            setFilters({ ...filters, to: e.target.value });
            setPage(1);
          }}
        />

        <input
          type="text"
          className="border p-2 rounded dark:bg-gray-700 dark:text-white"
          placeholder="Client Name"
          value={filters.client}
          onChange={(e) => {
            setFilters({ ...filters, client: e.target.value });
            setPage(1);
          }}
        />

        <input
          type="text"
          className="border p-2 rounded flex-1 dark:bg-gray-700 dark:text-white"
          placeholder="Search candidate / mobile"
          value={filters.search}
          onChange={(e) => {
            setFilters({ ...filters, search: e.target.value });
            setPage(1);
          }}
        />

        <button
          onClick={resetFilters}
          className="bg-gray-200 px-4 py-2 rounded dark:bg-gray-600 dark:text-white"
        >
          Reset
        </button>
      </div>

      {/* LIMIT SELECTOR */}
      <div className="flex justify-end mb-2">
        <select
          className="border p-2 rounded dark:bg-gray-700 dark:text-white"
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
        >
          <option value={10}>10 rows</option>
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow overflow-x-auto">
        <table className="min-w-full border rounded">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-left">
              <th className="p-3 border">Candidate</th>
              <th className="p-3 border">Mobile</th>
              <th className="p-3 border">Client</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Created At</th>
              <th className="p-3 border text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan="6">
                  No invites found.
                </td>
              </tr>
            ) : (
              invites.map((v) => (
                <tr
                  key={v._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  <td className="p-3 border">{v.candidateName}</td>
                  <td className="p-3 border">{v.candidateMobile}</td>
                  <td className="p-3 border">{v.clientName}</td>

                  <td className="p-3 border">
                    <InviteStatusBadge used={v.tokenDisabled} />
                  </td>

                  <td className="p-3 border">
                    {new Date(v.createdAt).toLocaleString()}
                  </td>

                  <td className="p-3 flex items-center justify-center">
                    <FaEye
                      className="text-blue-600 cursor-pointer hover:scale-110 transition"
                      onClick={() =>
                        (window.location.href = `/admin/invite/${v._id}`)
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-center mt-4 gap-2">
          <button
            className={`px-3 py-2 rounded ${
              page === 1
                ? "bg-gray-200 dark:bg-gray-600"
                : "bg-blue-600 text-white"
            }`}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-2 rounded ${
                page === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            className={`px-3 py-2 rounded ${
              page === totalPages
                ? "bg-gray-200 dark:bg-gray-600"
                : "bg-blue-600 text-white"
            }`}
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

/* STATUS BADGE */
function InviteStatusBadge({ used }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        used
          ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200"
      }`}
    >
      {used ? "Submitted" : "Pending"}
    </span>
  );
}
