import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import L from "leaflet";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
} from "@ionic/react";
import { arrowBackOutline, locateOutline } from "ionicons/icons";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "./MapPage.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_POSITION: [number, number] = [36.8065, 10.1815];

const parseHistoryPosition = (
  search: string,
): { position: [number, number]; isHistoryFocus: boolean } | null => {
  const params = new URLSearchParams(search);
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    position: [latitude, longitude],
    isHistoryFocus: params.get("focus") === "history",
  };
};

type MapControllerProps = {
  position: [number, number] | null;
};

const MapController: React.FC<MapControllerProps> = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (position) {
      map.setView(position, 16, { animate: true });
    }
  }, [map, position]);

  return null;
};

const MapPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const initialHistory = parseHistoryPosition(location.search);
  const [position, setPosition] = useState<[number, number] | null>(
    initialHistory?.position ?? null,
  );
  const [isHistoryPosition, setIsHistoryPosition] = useState(
    initialHistory !== null,
  );
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocation = async () => {
    setIsLoading(true);
    setError("");
    setIsHistoryPosition(false);

    try {
      let latitude: number;
      let longitude: number;
      let currentAccuracy: number;

      if (Capacitor.isNativePlatform()) {
        const permissions = await Geolocation.requestPermissions();
        if (permissions.location !== "granted") {
          throw new Error("Permission de localisation refusée");
        }

        const currentPosition = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        latitude = currentPosition.coords.latitude;
        longitude = currentPosition.coords.longitude;
        currentAccuracy = currentPosition.coords.accuracy;
      } else {
        if (!navigator.geolocation) {
          throw new Error(
            "La géolocalisation n'est pas supportée par ce navigateur",
          );
        }

        const currentPosition = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          },
        );
        latitude = currentPosition.coords.latitude;
        longitude = currentPosition.coords.longitude;
        currentAccuracy = currentPosition.coords.accuracy;
      }

      setPosition([latitude, longitude]);
      setAccuracy(currentAccuracy);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible d'obtenir votre position",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialHistory) {
      void fetchLocation();
    } else {
      setIsLoading(false);
    }
  }, []);

  const mapCenter = position ?? DEFAULT_POSITION;

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="map-content">
        <div className="map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={initialHistory?.isHistoryFocus || position ? 16 : 13}
            zoomControl={false}
            className="leaflet-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {position && (
              <Marker position={position}>
                <Popup>
                  <strong>
                    {isHistoryPosition
                      ? "Position historique"
                      : "Votre position"}
                  </strong>
                  <br />
                  Latitude : {position[0].toFixed(6)}
                  <br />
                  Longitude : {position[1].toFixed(6)}
                  <br />
                  Précision : ±{(accuracy ?? 0).toFixed(0)} m
                </Popup>
              </Marker>
            )}

            <MapController position={position} />
          </MapContainer>

          <IonButton
            className="map-back-btn"
            fill="solid"
            aria-label="Retour à l'accueil"
            onClick={() => history.push("/home")}
          >
            <IonIcon slot="icon-only" icon={arrowBackOutline} />
          </IonButton>

          {isLoading && (
            <div className="map-overlay" role="status">
              <IonSpinner name="crescent" />
              <span>Localisation en cours…</span>
            </div>
          )}

          {error && !isLoading && <div className="map-error">{error}</div>}

          {position && (
            <div className="info-card">
              <div>
                <span>Latitude</span>
                <strong>{position[0].toFixed(6)}</strong>
              </div>
              <div>
                <span>Longitude</span>
                <strong>{position[1].toFixed(6)}</strong>
              </div>
              <div>
                <span>Précision</span>
                <strong>{(accuracy ?? 0).toFixed(0)} m</strong>
              </div>
            </div>
          )}

          <IonButton
            className="locate-btn"
            fill="solid"
            aria-label="Recentrer sur ma position"
            onClick={() => void fetchLocation()}
            disabled={isLoading}
          >
            <IonIcon slot="icon-only" icon={locateOutline} />
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MapPage;
