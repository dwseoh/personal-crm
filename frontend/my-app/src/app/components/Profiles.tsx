// components/Profiles.tsx
interface ProfilesProps {
  name: string;
  onClick?: () => void;
}

export default function Profiles({ name, onClick }: ProfilesProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 h-55"
    >
      {name}
    </button>
  );
}
