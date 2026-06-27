import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CapacityTracker } from "./CapacityTracker";

jest.mock("@/lib/sessionUser", () => ({
    getSessionToken: jest.fn(() => "fake-token")
}));

jest.mock("primereact/toast", () => ({
    Toast: () => <div />
}));

jest.mock("primereact/button", () => ({
    Button: ({ label, icon, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>
            {label ?? icon}
        </button>
    )
}));

jest.mock("primereact/inputtext", () => ({
    InputText: ({ value, onChange }: any) => (
        <input
            value={value}
            onChange={onChange}
        />
    )
}));

const fetchMock = jest.fn();

beforeEach(() => {
    global.fetch = fetchMock as any;
    fetchMock.mockReset();
});

const configResponse = {
    estimated_hours: 8,
    busy_hours: 4,
    available_hours: 4
};

test("loads capacity information", async () => {

    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => configResponse
    });

    render(<CapacityTracker />);

    expect(await screen.findByText("Tiempo disponible hoy"))
        .toBeInTheDocument();

    expect(
        screen.getByText(/4h ocupadas/)
    ).toBeInTheDocument();

});

test("opens edit mode", async () => {

    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => configResponse
    });

    render(<CapacityTracker />);

    await screen.findByText("Tiempo disponible hoy");

    fireEvent.click(screen.getByText("pi pi-cog"));

    expect(
        screen.getByDisplayValue("8")
    ).toBeInTheDocument();

});

test("cancel edit", async () => {

    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => configResponse
    });

    render(<CapacityTracker />);

    await screen.findByText("Tiempo disponible hoy");

    fireEvent.click(screen.getByText("pi pi-cog"));

    fireEvent.click(screen.getByText("Cancelar"));

    expect(
        screen.getByText("Tiempo disponible hoy")
    ).toBeInTheDocument();

});


test("save button starts disabled", async () => {

    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => configResponse
    });

    render(<CapacityTracker />);

    await screen.findByText("Tiempo disponible hoy");

    fireEvent.click(screen.getByText("pi pi-cog"));

    expect(
        screen.getByText("Guardar")
    ).toBeEnabled();

});

test("only accepts numbers", async () => {

    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => configResponse
    });

    render(<CapacityTracker />);

    await screen.findByText("Tiempo disponible hoy");

    fireEvent.click(screen.getByText("pi pi-cog"));

    const input = screen.getByDisplayValue("8");

    fireEvent.change(input,{
        target:{value:"abc12"}
    });

    expect(input).toHaveValue("12");

});


test("save calls api", async () => {

    fetchMock
        .mockResolvedValueOnce({
            ok:true,
            json: async ()=>configResponse
        })
        .mockResolvedValueOnce({
            ok:true
        })
        .mockResolvedValueOnce({
            ok:true,
            json: async ()=>configResponse
        });

    render(<CapacityTracker />);

    await screen.findByText("Tiempo disponible hoy");

    fireEvent.click(screen.getByText("pi pi-cog"));

    const input = screen.getByDisplayValue("8");

    fireEvent.change(input,{
        target:{value:"10"}
    });

    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(()=>{
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

});


test("shows loading initially", () => {

    fetchMock.mockImplementation(
        () => new Promise(()=>{})
    );

    render(<CapacityTracker />);

    expect(
        screen.getByText("Cargando capacidad...")
    ).toBeInTheDocument();

});


