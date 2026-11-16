import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

export function AccountInfoManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    org_name: '',
    org_address: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    vietqr_storage_key: '',
  });
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchBankInfo();
  }, []);

  const fetchBankInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_info')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          org_name: data.org_name || 'Happy English Club',
          org_address: data.org_address || '',
          bank_name: data.bank_name || '',
          account_number: data.account_number || '',
          account_name: data.account_name || '',
          vietqr_storage_key: data.vietqr_storage_key || '',
        });
        
        // Load QR code preview if exists
        if (data.vietqr_storage_key) {
          const { data: urlData } = supabase.storage
            .from('qr-codes')
            .getPublicUrl(data.vietqr_storage_key);
          setQrPreviewUrl(urlData.publicUrl);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading account info",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('qr-codes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('qr-codes')
        .getPublicUrl(fileName);

      setFormData({ ...formData, vietqr_storage_key: fileName });
      setQrPreviewUrl(urlData.publicUrl);

      toast({
        title: "Uploaded",
        description: "QR code uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveQr = async () => {
    if (!formData.vietqr_storage_key) return;

    try {
      const { error } = await supabase.storage
        .from('qr-codes')
        .remove([formData.vietqr_storage_key]);

      if (error) throw error;

      setFormData({ ...formData, vietqr_storage_key: '' });
      setQrPreviewUrl(null);

      toast({
        title: "Removed",
        description: "QR code removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error removing",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bank_info')
        .upsert({
          id: 1,
          ...formData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Account information updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization & Banking Information</CardTitle>
        <CardDescription>
          This information will appear on all invoices issued to students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org_name">Organization Name</Label>
          <Input
            id="org_name"
            value={formData.org_name}
            onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
            placeholder="Happy English Club"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org_address">Organization Address</Label>
          <Textarea
            id="org_address"
            value={formData.org_address}
            onChange={(e) => setFormData({ ...formData, org_address: e.target.value })}
            placeholder="Enter your organization's address"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input
              id="bank_name"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="Sacombank"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name</Label>
            <Input
              id="account_name"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="Nguyen Thi Thu Huong"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account_number">Account Number</Label>
          <Input
            id="account_number"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            placeholder="020975679889"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vietqr-file">VietQR Code</Label>
          <div className="flex flex-col gap-3">
            {qrPreviewUrl ? (
              <div className="relative inline-block">
                <img 
                  src={qrPreviewUrl} 
                  alt="QR Code Preview" 
                  className="h-32 w-32 object-contain border rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={handleRemoveQr}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="vietqr-file"
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Upload a QR code image to display on invoices for easy payment
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
