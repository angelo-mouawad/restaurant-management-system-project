"use client";

import { useParams } from "next/navigation";
import RequireRole from "@components/layout/RequireRole";
import ProfileView from "@components/profile/ProfileView";

const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireRole>
      <ProfileView userId={Number(id)} />
    </RequireRole>
  );
};

export default ProfilePage;
