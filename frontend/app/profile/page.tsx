"use client";

import RequireRole from "@components/layout/RequireRole";
import ProfileView from "@components/profile/ProfileView";
import useAuth from "@hooks/useAuth";

const MyProfilePage = () => {
  const { user } = useAuth();
  return <RequireRole>{user && <ProfileView userId={user.id} />}</RequireRole>;
};

export default MyProfilePage;
