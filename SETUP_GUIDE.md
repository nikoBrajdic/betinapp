# Household Admin Dashboard - Authentication Setup Guide

This guide will walk you through setting up Google OAuth authentication with invite-based access control for your household admin dashboard.

## Overview

The authentication system uses:
- **Google OAuth** as the only sign-in provider
- **Invite codes** to control who can sign up
- **Supabase** for database and authentication
- **Role-based access**: Superadmin (can invite others) and Admin (regular access)

---

## Step 1: Configure Google OAuth

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **Household Admin Dashboard**
   - User support email: Your email
   - Developer contact: Your email
6. For Application type, select **Web application**
7. Add **Authorized redirect URIs**:
   \`\`\`
   https://[YOUR-SUPABASE-PROJECT-REF].supabase.co/auth/v1/callback
   \`\`\`
   Replace `[YOUR-SUPABASE-PROJECT-REF]` with your actual Supabase project reference ID
   
8. Click **Create** and save your:
   - **Client ID**
   - **Client Secret**

### 1.2 Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Enable the Google provider
6. Enter your **Client ID** and **Client Secret** from Step 1.1
7. Click **Save**

---

## Step 2: Set Up Supabase Database

### 2.1 Run Database Migration Scripts

The project includes SQL scripts that need to be run in order. You can run these directly from v0:

1. **Create main tables** (notes, tasks, events, etc.):
   - Run `scripts/001_create_tables.sql`
   
2. **Enable Row Level Security**:
   - Run `scripts/002_enable_rls.sql`
   
3. **Add sample data** (optional):
   - Run `scripts/003_seed_data.sql`
   
4. **Create authentication tables** (user profiles and invites):
   - Run `scripts/004_create_auth_tables.sql`

### 2.2 Create Your Superadmin Account

**IMPORTANT**: You must do this AFTER your first Google sign-in.

1. First, sign in to the app using Google OAuth at `/auth/login`
   - This will create your user account in Supabase Auth
   
2. Open `scripts/005_create_superadmin.sql`

3. **Replace the email** with your Google account email:
   \`\`\`sql
   -- Change this line:
   WHERE email = 'your-email@gmail.com'
   -- To your actual email:
   WHERE email = 'john.doe@gmail.com'
   \`\`\`

4. Run the modified script in Supabase:
   - Go to Supabase Dashboard → **SQL Editor**
   - Paste the script
   - Click **Run**

5. Refresh your app - you should now see "Manage Admins" in the sidebar

---

## Step 3: Configure Environment Variables

### 3.1 Add Development Redirect URL

For local development, add this environment variable:

\`\`\`
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

This ensures Google OAuth redirects work correctly during development.

### 3.2 Verify Supabase Variables

These should already be configured in your v0 project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 4: Using the Authentication System

### 4.1 Superadmin First Login

1. Navigate to `/auth/login`
2. Click **Sign in with Google**
3. Authorize the application
4. Run the superadmin script (Step 2.2) with your email
5. You're now a superadmin!

### 4.2 Inviting New Admins

As a superadmin, you can invite others:

1. Go to **Manage Admins** in the sidebar (or navigate to `/admin/manage`)
2. Click **Create New Invite**
3. Enter the invitee's email address
4. Click **Create Invite**
5. Copy the generated invite code
6. Share the invite code with the person you want to invite

**Invite Code Format**: `INV-XXXXXXXX` (8 random characters)

**Invite Expiration**: Invites expire after 7 days

### 4.3 Admin Sign-Up Flow

When someone receives an invite code:

1. They navigate to `/auth/signup`
2. Enter their invite code
3. Click **Verify Invite Code**
4. If valid, they're redirected to Google OAuth
5. After Google authorization, they're automatically signed in
6. Their invite is marked as "used" and they become an admin

### 4.4 Managing Invites

In the **Manage Admins** page, you can:

- **View all invites** with their status (pending/used/expired)
- **See who created each invite** and when
- **Delete expired invites** to keep the list clean
- **View all admin users** with their roles and join dates
- **Remove admin access** if needed

---

## Step 5: Testing the Setup

### 5.1 Test Superadmin Access

1. Sign in with your Google account
2. Verify you see "Manage Admins" in the sidebar
3. Try creating an invite code
4. Check that the invite appears in the invites table

### 5.2 Test Admin Invitation

1. Create an invite code as superadmin
2. Open an incognito/private browser window
3. Go to `/auth/signup`
4. Enter the invite code
5. Complete Google OAuth
6. Verify the new admin can access the dashboard
7. Verify they DON'T see "Manage Admins" (only superadmins can)

### 5.3 Test Route Protection

1. Sign out
2. Try accessing `/` or any dashboard page
3. You should be redirected to `/auth/login`
4. Sign in to regain access

---

## Troubleshooting

### Issue: "Invalid invite code"

**Causes**:
- Invite code was typed incorrectly (check for spaces)
- Invite has already been used
- Invite has expired (>7 days old)
- Invite was deleted by superadmin

**Solution**: Request a new invite code from the superadmin

### Issue: "Redirect URI mismatch" error from Google

**Causes**:
- The redirect URI in Google Cloud Console doesn't match Supabase

**Solution**: 
1. Check your Supabase project URL
2. Ensure the redirect URI in Google Console is exactly:
   \`\`\`
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   \`\`\`

### Issue: Not redirected after Google sign-in

**Causes**:
- Missing `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` environment variable

**Solution**: Add the environment variable (see Step 3.1)

### Issue: Can't access "Manage Admins"

**Causes**:
- You're not a superadmin
- The superadmin script wasn't run with your email

**Solution**: 
1. Check your email in the script
2. Re-run `scripts/005_create_superadmin.sql` with correct email
3. Sign out and sign back in

### Issue: Database errors when running scripts

**Causes**:
- Scripts run out of order
- Tables already exist

**Solution**: 
1. Run scripts in numerical order (001, 002, 003, 004, 005)
2. If tables exist, you can skip that script or drop tables first

---

## Security Notes

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Only allow authenticated users to read/write data
- Restrict invite management to superadmins only
- Prevent users from modifying other users' profiles

### Invite Code Security

- Invite codes are randomly generated (8 characters)
- Codes expire after 7 days
- Each code can only be used once
- Only superadmins can create/delete invites

### Role Hierarchy

- **Superadmin**: Full access, can invite others, manage all data
- **Admin**: Full access to dashboard features, cannot invite others

---

## Next Steps

After setup is complete:

1. **Customize the superadmin email** in the script for your household
2. **Invite family members** using the invite system
3. **Start using the dashboard** to manage household tasks, notes, bills, etc.
4. **Set up Google Calendar sync** (optional, future enhancement)
5. **Configure email notifications** (optional, future enhancement)

---

## Support

If you encounter issues not covered in this guide:
1. Check the Supabase logs in your dashboard
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Ensure Google OAuth is properly configured

---

## Quick Reference

### Important URLs

- Login: `/auth/login`
- Signup: `/auth/signup`
- Admin Management: `/admin/manage`
- Dashboard: `/`

### Default Roles

- **Superadmin**: Can invite others, full access
- **Admin**: Full dashboard access, cannot invite

### Invite Code Format

- Format: `INV-XXXXXXXX`
- Length: 12 characters (INV- prefix + 8 random chars)
- Expiration: 7 days
- Single use only

---

**Setup Complete!** 🎉

Your household admin dashboard is now secured with Google OAuth and invite-based access control.
