use clap::Parser;
use common::Backend;

#[derive(Debug, Parser)]
#[clap(author, version, about, long_about = "Create a device")]
struct CliOpts {
    #[clap(short = 'n', long)]
    pub name: String,

    #[clap(short = 'b', long = "box")]
    pub box_: String,

    #[clap(short = 'x', long)]
    pub long: f32,
    #[clap(short = 'y', long)]
    pub lat: f32,
}

#[tokio::main]
async fn main() {
    let cli = CliOpts::parse();

    let backend = Backend::new().await;

    let mut conn = backend.get_connection().await.unwrap();

    let id = backend
        .create_device(&mut conn, cli.name, cli.box_, cli.long, cli.lat)
        .await
        .unwrap();

    println!("Created Device ID: {id}");
}
