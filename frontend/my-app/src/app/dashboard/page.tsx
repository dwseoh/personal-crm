"use client";
import Profiles from "../components/Profiles";
import Sidebar from "../components/Sidebar";
import Add from "../components/Add";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  interface Contact {
    name: string;
    email: string;
    phone: string;
  }

  const [contacts, setContacts] = useState<Contact[]>([]);
  let contactStrings: any[][] = [];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    fetch("http://127.0.0.1:8000/contacts/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          console.error("Error:", errData);
          if (errData.detail?.includes("expired")) {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("user_id");
            router.push("/login");
          }
          throw new Error(errData.detail || "Failed to fetch contacts");
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setContacts(data);
        else setContacts([]);
      })
      .catch((err) => console.error(err));
  }, [router]);

  if (contacts) {
    contactStrings = contacts.map((contact: any) => [
      contact.name,
      contact.email,
      contact.phone,
    ]);
  } else {
    contactStrings = [["No contacts", "Add contacts", "to see them here"]];
  }

  return (
    <main className="relative min-h-screen p-8 bg-slate-900">
      <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">
        Welcome
      </h1>
      <p className="absolute left-1/2 -translate-x-1/2 translate-y-10">
        DASHBOARD
      </p>

      {/* Button in bottom-right */}
      <Add />
      <Sidebar />
      <div className="relative min-h-screen grid grid-cols-5 gap-4 p-10">
        {contactStrings.map((text, index) => (
          <Profiles
            key={index}
            name={text[0]}
            email={text[1]}
            phone={text[2]}
          />
        ))}
      </div>
    </main>
  );
}
