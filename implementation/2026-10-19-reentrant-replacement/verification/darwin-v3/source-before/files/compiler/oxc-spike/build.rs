fn main() {
    let target = std::env::var("TARGET").expect("Cargo must supply the compiler target triple");
    println!("cargo:rustc-env=R3ACT_COMPILER_TARGET={target}");
}
