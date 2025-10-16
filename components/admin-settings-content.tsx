"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Setting {
  id: string
  key: string
  value: string | null
  description: string | null
}

interface AdminSettingsContentProps {
  initialSettings: Setting[]
}

export default function AdminSettingsContent({ initialSettings }: AdminSettingsContentProps) {
  const [settings, setSettings] = useState<Record<string, string>>(
    initialSettings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value || ""
        return acc
      },
      {} as Record<string, string>,
    ),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus("idle")
    setErrorMessage("")

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
      setSaveStatus("error")
      setErrorMessage("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestTelegram = async () => {
    try {
      const response = await fetch("/api/admin/test-telegram", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to send test message")
      }

      alert("Test message sent! Check your Telegram.")
    } catch (error) {
      console.error("Error testing Telegram:", error)
      alert("Failed to send test message. Please check your credentials.")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground mt-2">Configure application settings and integrations</p>
        </div>

        {saveStatus === "success" && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">Settings saved successfully!</AlertDescription>
          </Alert>
        )}

        {saveStatus === "error" && (
          <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Telegram Bot Configuration</CardTitle>
            <CardDescription>Configure your Telegram bot for SMS verification approvals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="telegram_bot_token">Telegram Bot Token</Label>
              <Input
                id="telegram_bot_token"
                type="password"
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={settings.telegram_bot_token || ""}
                onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">Get your bot token from @BotFather on Telegram</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
              <Input
                id="telegram_chat_id"
                type="text"
                placeholder="123456789"
                value={settings.telegram_chat_id || ""}
                onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">Get your chat ID from @userinfobot on Telegram</p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Setup Instructions:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Open Telegram and search for @BotFather</li>
                <li>Send /newbot and follow instructions to create a bot</li>
                <li>Copy the bot token and paste it above</li>
                <li>Search for @userinfobot and start a chat</li>
                <li>Copy your chat ID and paste it above</li>
                <li>Click Save Settings below</li>
                <li>Click Test Telegram to verify it works</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
              <Button
                onClick={handleTestTelegram}
                variant="outline"
                disabled={!settings.telegram_bot_token || !settings.telegram_chat_id}
              >
                Test Telegram
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
