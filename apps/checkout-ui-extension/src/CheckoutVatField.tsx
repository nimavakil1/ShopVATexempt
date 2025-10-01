import {
  Banner,
  BlockStack,
  Button,
  InlineStack,
  Spinner,
  Text,
  TextField,
  reactExtension,
  useCustomer,
  useShippingAddress
} from "@shopify/checkout-ui-extensions-react";
import { useCallback, useState } from "react";

type Status = "idle" | "loading" | "valid" | "invalid" | "error" | "ineligible";

const APP_PROXY_BASE_PATH = "/apps/vat";

export default reactExtension("Checkout::Dynamic::Render", () => <App />);

function App() {
  const customer = useCustomer();
  const shippingAddress = useShippingAddress();
  const [vatNumber, setVatNumber] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const countryCode = shippingAddress?.countryCode ?? "";

  const handleValidate = useCallback(async () => {
    setStatus("loading");
    setMessage(null);

    try {
      const validateRes = await fetch(`${APP_PROXY_BASE_PATH}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vatNumber, countryCode })
      });
      const validateJson = await validateRes.json();
      if (!validateRes.ok || !validateJson.ok) {
        throw new Error("VALIDATION_FAILED");
      }

      if (!validateJson.valid) {
        setStatus("invalid");
        setMessage("The VAT number could not be validated with VIES.");
        return;
      }

      if (!validateJson.euOk) {
        setStatus("ineligible");
        setMessage("VAT exemption is only available for EU customers outside Belgium.");
        return;
      }

      const customerId = customer?.id;
      if (!customerId) {
        setStatus("error");
        setMessage("Please sign in before applying a VAT exemption.");
        return;
      }

      const applyRes = await fetch(`${APP_PROXY_BASE_PATH}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          vatNumber: validateJson.normalizedVat,
          countryCode,
          valid: true
        })
      });

      const applyJson = await applyRes.json();
      if (!applyRes.ok || !applyJson.ok) {
        throw new Error("APPLY_FAILED");
      }

      // There is no checkout.refresh() anymore.
      setStatus("valid");
      setMessage("VAT number validated. Taxes have been updated.");
    } catch (error) {
      setStatus("error");
      setMessage("The validation service is temporarily unavailable. Please try again.");
    }
  }, [customer, countryCode, vatNumber]);

  return (
    <BlockStack spacing="tight">
      <TextField
        label="VAT number"
        value={vatNumber}
        onChange={setVatNumber}
        autocomplete={false}
      />
      <InlineStack>
        <Button onPress={handleValidate} accessibilityLabel="Validate VAT number">
          Validate VAT
        </Button>
        {status === "loading" && <Spinner accessibilityLabel="Validating VAT number" />}
      </InlineStack>
      <StatusBanner status={status} message={message} />
    </BlockStack>
  );
}

type StatusBannerProps = {
  status: Status;
  message: string | null;
};

function StatusBanner({ status, message }: StatusBannerProps) {
  if (!message) return null;

  switch (status) {
    case "valid":
      return (
        <Banner status="success">
          <Text>{message}</Text>
        </Banner>
      );
    case "invalid":
    case "ineligible":
      return (
        <Banner status="critical">
          <Text>{message}</Text>
        </Banner>
      );
    case "error":
      return (
        <Banner status="warning">
          <Text>{message}</Text>
        </Banner>
      );
    default:
      return null;
  }
}
