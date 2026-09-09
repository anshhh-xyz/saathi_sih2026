#!/usr/bin/env python3
import os
import sys
import certifi
import dulwich.porcelain as porcelain

os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

repo_dir = os.path.dirname(os.path.abspath(__file__))

def push(token=None):
    if not token:
        token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    
    if not token:
        if len(sys.argv) > 1:
            token = sys.argv[1].strip()
        else:
            print("Usage: python3 push_to_github.py <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>")
            token = input("Enter your GitHub Personal Access Token (PAT): ").strip()
    
    if not token:
        print("Error: No GitHub token provided.")
        sys.exit(1)
    
    remote_url = f"https://x-access-token:{token}@github.com/anshhh-xyz/saathi_sih2026.git"
    
    print(f"Staging and committing any uncommitted changes in {repo_dir}...")
    porcelain.add(repo_dir)
    try:
        commit_id = porcelain.commit(repo_dir, message=b"feat: complete SIH 2026 SAATHI frontend replicated with official NHAPOA UI")
        print(f"Committed changes ({commit_id.decode()[:8]})")
    except Exception:
        print("Working tree clean, no new commit needed.")
    
    print("Pushing to https://github.com/anshhh-xyz/saathi_sih2026 (branch: main)...")
    try:
        # Push master to main with force
        porcelain.push(repo_dir, remote_location=remote_url, refspecs=['+refs/heads/master:refs/heads/main'])
        print("\nSUCCESS! Successfully pushed all files to https://github.com/anshhh-xyz/saathi_sih2026 on branch 'main'!")
    except Exception as e:
        print(f"\nPush failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    push()
