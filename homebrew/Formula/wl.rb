class Wl < Formula
  desc "Worklog - track work progress during development sessions"
  homepage "https://github.com/dohzya/tools"
  version "0.4.2"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.4.2/wl-darwin-arm64"
      sha256 "47c991644d82ff034d43cba571c8d1a57f3d6aa81b12e25860888f1f1c1e05bf"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.4.2/wl-darwin-x86_64"
      sha256 "9cf669f6bc325463975c46dbd43e6e64ad5a92a2b3d2cc02b2e46ff501a3ba09"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.4.2/wl-linux-arm64"
      sha256 "04e23fbb2c51d9d362040b22a3e4f44791c183b44cafb4d9d91f74390b6321d3"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.4.2/wl-linux-x86_64"
      sha256 "b5ff65573b340573c324e866c8e1021721b60f3caa707a828dc989e747bced85"
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
