import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  User,
  Mail,
  Globe,
  Twitter,
  Github,
  Linkedin,
  Instagram,
  Youtube,
  Twitch,
  Check,
} from "lucide-react";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    website: "",
    twitter: "",
    github: "",
    linkedin: "",
    instagram: "",
    youtube: "",
    twitch: "",
  });
  const [message, setMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("User not authenticated");
        setShowPopup(true);
        setLoading(false);
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `display_name, bio, website, twitter, github, linkedin, instagram, youtube, twitch, avatar_url`
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setMessage("Failed to fetch profile");
        setShowPopup(true);
      }

      if (data) {
        setFormData({
          display_name: data.display_name || "",
          bio: data.bio || "",
          website: data.website || "",
          twitter: data.twitter || "",
          github: data.github || "",
          linkedin: data.linkedin || "",
          instagram: data.instagram || "",
          youtube: data.youtube || "",
          twitch: data.twitch || "",
        });
        setProfilePic(data.avatar_url || null);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const validateUrl = (value) => {
    if (!value) return "";
    try {
      new URL(value);
      return "";
    } catch {
      return "Must be a valid URL";
    }
  };

  const updateProfile = async () => {
    if (!user) {
      setMessage("User not authenticated");
      setShowPopup(true);
      return;
    }

    if (!formData.display_name.trim()) {
      setMessage("Display Name is required");
      setShowPopup(true);
      return;
    }

    setLoading(true);

    const { data: existing, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", formData.display_name.trim())
      .neq("id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking display_name uniqueness:", checkError);
      setMessage("Error validating display name uniqueness");
      setShowPopup(true);
      setLoading(false);
      return;
    }
    if (existing) {
      setMessage("UserName Already Exist");
      setShowPopup(true);
      setLoading(false);
      return;
    }

    const urlFields = [
      "website",
      "twitter",
      "github",
      "linkedin",
      "instagram",
      "youtube",
      "twitch",
    ];
    let hasError = false;
    const newErrors = { ...errors };
    urlFields.forEach((field) => {
      const errorMsg = validateUrl(formData[field]);
      if (errorMsg) {
        newErrors[field] = errorMsg;
        hasError = true;
      }
    });
    setErrors(newErrors);
    if (hasError) {
      setMessage("Please fix the errors before saving.");
      setShowPopup(true);
      setLoading(false);
      return;
    }

    const updates = {
      id: user.id,
      display_name: formData.display_name.trim(),
      bio: formData.bio,
      website: formData.website,
      twitter: formData.twitter,
      github: formData.github,
      linkedin: formData.linkedin,
      instagram: formData.instagram,
      youtube: formData.youtube,
      twitch: formData.twitch,
      avatar_url: profilePic,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      if (
        error.message &&
        error.message.includes(
          'duplicate key value violates unique constraint "profiles_display_name_key"'
        )
      ) {
        setMessage("UserName Already Exist");
      } else {
        setMessage(`Failed to update profile: ${error.message}`);
      }
      setShowPopup(true);
    } else {
      setMessage("Profile updated successfully");
      setShowPopup(true);
    }
    setLoading(false);

    setTimeout(() => setShowPopup(false), 3000);
  };

  const handleUpload = async (e) => {
    if (!user) {
      setMessage("User not authenticated");
      setShowPopup(true);
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      setMessage("Failed to upload avatar.");
      setShowPopup(true);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (error) {
      setMessage("Avatar update failed.");
      setShowPopup(true);
    } else {
      setProfilePic(publicUrl);
      setMessage("Profile picture updated!");
      setShowPopup(true);
    }

    setTimeout(() => setShowPopup(false), 3000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (
      [
        "website",
        "twitter",
        "github",
        "linkedin",
        "instagram",
        "youtube",
        "twitch",
      ].includes(name)
    ) {
      setErrors((prev) => ({ ...prev, [name]: validateUrl(value) }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center mt-8">
        <h2 className="text-4xl font-bold mb-2 mt-4 text-center">
          Account Settings
        </h2>
        <p className="mb-8 text-center text-xl text-gray-400">
          Manage your account.
        </p>
        <div className="max-w-3xl w-full mx-auto p-10 bg-[#172133] text-white rounded-xl shadow-lg border border-[#324154] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-white mb-6"></div>
          <div className="text-lg text-gray-200">Fetching profile...</div>
        </div>
      </div>
    );
  }

  // Custom X (Twitter) icon
  const XIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M20.39 3H16.9L12.75 9.25 8.59 3H3.25L9.88 12.4 3 21h3.49l4.57-6.59L16.1 21h5.4l-7.05-9.65L20.39 3z" />
    </svg>
  );

  return (
    <div className="flex flex-col items-center mt-8">
      <h2 className="text-4xl font-bold mb-2 mt-4 text-center">
        Account Settings
      </h2>
      <p className="mb-8 text-center text-xl text-gray-400">
        Manage your account.
      </p>
      <div className="max-w-3xl w-full mx-auto mt-10 p-10 bg-[#172133] text-white rounded-xl shadow-lg border" style={{ borderColor: "#324154" }}>
        <div className="flex flex-col mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-2">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-600 flex items-center justify-center text-2xl text-white rounded-full">
                  <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>
              )}
            </div>
            <label className="bg-gray-700 text-lg px-3 py-1 rounded hover:bg-gray-600 cursor-pointer mb-1">
              Upload profile picture
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <InputField label="Display Name *" name="display_name" value={formData.display_name} onChange={handleChange} icon={<User size={18} />} />
          <InputField label="Email" name="email" value={user?.email || ""} onChange={() => {}} readOnly icon={<Mail size={18} />} />
          <TextAreaField label="Bio" name="bio" value={formData.bio} onChange={handleChange} />
          <InputField label="Website URL" name="website" value={formData.website} onChange={handleChange} placeholder="https://www.example.com" icon={<Globe size={18} />} error={errors.website} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <InputField label="X URL" name="twitter" value={formData.twitter} onChange={handleChange} placeholder="https://www.x.com/yourhandle" icon={XIcon} error={errors.twitter} />
              <InputField label="Github URL" name="github" value={formData.github} onChange={handleChange} placeholder="https://www.github.com/yourhandle" icon={<Github size={18} />} error={errors.github} />
              <InputField label="LinkedIn URL" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://www.linkedin.com/in/yourhandle" icon={<Linkedin size={18} />} error={errors.linkedin} />
            </div>
            <div className="space-y-4">
              <InputField label="Instagram URL" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="https://www.instagram.com/yourhandle" icon={<Instagram size={18} />} error={errors.instagram} />
              <InputField label="Youtube Channel URL" name="youtube" value={formData.youtube} onChange={handleChange} placeholder="https://www.youtube.com/yourchannel" icon={<Youtube size={18} />} error={errors.youtube} />
              <InputField label="Twitch URL" name="twitch" value={formData.twitch} onChange={handleChange} placeholder="https://www.twitch.tv/yourchannel" icon={<Twitch size={18} />} error={errors.twitch} />
            </div>
          </div>
        </div>

        <button onClick={updateProfile} className="mt-8 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow" disabled={loading}>
          {loading ? "Saving..." : "Update Profile"}
        </button>
      </div>

      {showPopup && (
        <div className="fixed bottom-6 right-6 bg-white text-green-700 px-6 py-3 rounded shadow-lg flex items-center gap-2 z-50">
          <Check className="w-5 h-5 text-green-500" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
};

const InputField = ({
  label,
  name,
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  icon,
  error,
}) => (
  <div>
    <label className="block mb-1 text-lg text-gray-300 font-semibold">
      {label}
    </label>
    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-5 py-3 focus-within:ring-2 focus-within:ring-blue-500">
      {icon && <span className="mr-3 text-gray-400 text-lg">{icon}</span>}
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`flex-1 bg-transparent outline-none text-white placeholder:text-base placeholder:text-gray-400 ${
          readOnly ? "opacity-60 cursor-not-allowed" : ""
        }`}
      />
    </div>
    {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
  </div>
);

const TextAreaField = ({ label, name, value, onChange }) => (
  <div>
    <label className="block mb-1 text-lg text-gray-300 font-bold">
      {label}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={3}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-base placeholder:text-gray-400"
      placeholder="Write a few sentences about yourself."
    />
  </div>
);

export default Settings;
