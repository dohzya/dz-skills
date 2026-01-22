class Wl < Formula
  desc "Worklog - track work progress during development sessions"
  homepage "https://github.com/dohzya/dz-skills"
  version "0.4.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/dz-skills/releases/download/wl-v0.4.0/wl-darwin-arm64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/dz-skills/releases/download/wl-v0.4.0/wl-darwin-x86_64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/dz-skills/releases/download/wl-v0.4.0/wl-linux-arm64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/dz-skills/releases/download/wl-v0.4.0/wl-linux-x86_64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    end
  end

  def install
    # Determine which binary was downloaded based on platform
    binary_name = if OS.mac?
      if Hardware::CPU.arm?
        "wl-darwin-arm64"
      else
        "wl-darwin-x86_64"
      end
    else
      if Hardware::CPU.arm?
        "wl-linux-arm64"
      else
        "wl-linux-x86_64"
      end
    end

    bin.install binary_name => "wl"
  end

  test do
    system "#{bin}/wl", "--help"
  end
end
