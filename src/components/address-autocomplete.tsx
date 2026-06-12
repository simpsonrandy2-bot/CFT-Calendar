"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

export function AddressAutocomplete({ value, onChange, placeholder }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  useEffect(() => {
    if (!apiKey) return;

    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }

    window.initGoogleMaps = () => setLoaded(true);

    if (!document.getElementById("google-maps-script")) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!loaded || !inputRef.current || !apiKey) return;

    serviceRef.current = new window.google.maps.places.AutocompleteService();
    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: ["ca", "us"] },
      fields: ["formatted_address"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current!.getPlace();
      const address = place.formatted_address || (place as unknown as { name?: string }).name || "";
      if (address) {
        onChange(address);
        setShowSuggestions(false);
      }
    });
  }, [loaded, apiKey, onChange]);

  // Fallback: if no API key, just render a plain input
  if (!apiKey) {
    return (
      <div className="relative">
        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "123 Industrial Rd, City, Province"}
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Start typing an address..."}
        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoComplete="off"
      />
    </div>
  );
}
